// Pneumatics, hydraulics and plumbing (decision 0026, the user of 2026-11-06: "add 1000 new working parts, no mock"): the
// table-driven families of cylinders (ISO 6432, ISO 15552, ISO 6020-2) whose piston and rod slide on their stroke (a
// joint, so they move), 5/2 solenoid valves, filter regulators, silencers, quick couplings, pressure gauges (EN 837-1),
// JIC 37° fittings (SAE J514), ORFS fittings (SAE J1453), O-ring boss plugs and adaptors (SAE J1926), hydraulic hose
// (SAE 100R1AT, 100R2AT), bonded seals, PP-R (DIN 8077) and PE100 (EN 12201-2) pressure pipe, NPT fittings (ASME
// B1.20.1 threads), compression fittings (EN 1254-2), PEX pipe, crimp rings and insert fittings, garden hose connectors
// (GHT) and flanged gate valves (EN 558 series 14) whose gate slides. Each a table of rows and one recipe of the room operations (src/nexus/room.ts): no
// place is written here, every place is what an operation gives. Threads are never drawn: a female end's bore is drawn at
// the thread's major diameter, a male end's outside at it.
//
// Nothing here is copied from a file: every table is written from recall of the standard's or makers' published tables,
// read from no source to hand, and so labelled typical (status estimated) in FLUID_SOURCES and FLUID_STATUS, save where a
// row is this repository's own (ISO 228-1 threads, read from src/nexus/parts/plumbing.ts, bd_warehouse's, Apache-2.0; pipe
// walls from src/nexus/parts/bdw.ts NPS). The figures recalled are the standards' (ISO 6432 and ISO 15552 bores, rods,
// rod threads and ports; ASME B1.20.1 outsides, threads an inch and engagement; SAE J514 threads and tube sizes; EN 1254-2
// tube sizes; ASTM F876 CTS outsides and SDR 9; EN 837-1 dial sizes); the bodies
// round them (lengths, hexes, caps) are makers' proportions. None was cross-checked against a table here: left open.

import { Block, branch, joint, made, onto, over, room, run, stack, through, turn, type RunSeg } from '../room';
import { FLUID_NETWORK } from '../fluidnet';
import { densityKg } from '../mass';
import { familyNode, type Expect, type PartFamily } from './maker';
import type { BlockDef } from '../blocks';
import { ISO228 } from './plumbing';
import { NPS } from './bdw';

const mm = (x: number): number => x / 1000;
const inch = (x: number): number => x * 0.0254;
const rho = (mat: string): number => { const d = densityKg(mat); if (d === undefined) throw new Error(`no density for ${mat}`); return d; };
const annV = (ri: number, ro: number, h: number) => Math.PI * (ro * ro - ri * ri) * h;
const cylV = (r: number, h: number) => Math.PI * r * r * h;
const bendV = (ri: number, ro: number, R: number, deg: number) => Math.PI * (ro * ro - ri * ri) * R * (deg * Math.PI) / 180;
const hexV = (af: number, h: number, ri = 0) => ((Math.sqrt(3) / 2) * af * af - Math.PI * ri * ri) * h;
const cupV = (r: number, h: number, wall: number, floor: number) => Math.PI * r * r * h - Math.PI * (r - wall) ** 2 * (h - floor);
const coneV = (r1: number, r2: number, h: number, ri = 0) => (Math.PI * h * (r1 * r1 + r1 * r2 + r2 * r2)) / 3 - Math.PI * ri * ri * h;
const latheV = (pts: readonly (readonly [number, number])[]) => { let s = 0; for (let i = 0; i < pts.length; i++) { const [r0, h0] = pts[i]!, [r1, h1] = pts[(i + 1) % pts.length]!; s += (r0 * h1 - r1 * h0) * (r0 + r1); } return Math.abs((Math.PI * s) / 3); };
const cor = (af: number) => (2 * af) / Math.sqrt(3);
const len = (set: Record<string, unknown>, k = 'length') => Number(set[k]) / 1000;
const ALU = 0xb8bcc2, STEEL = 0x8a8c90, BRASS = 0xc9a23f, BLACK = 0x1c1c1c, BLUE = 0x2f6fb0, COPPER = 0xb87333, ZINC = 0x9fa6ad, CLEAR = 0xdfe8ee, PEXRED = 0xb03a2e;
/** The major diameter of a port thread, mm: ISO 228-1's (plumbing.ts ISO228) or a metric fine one. */
const majorOf = (t: string): number => (t === 'M5' ? 5 : ISO228[t]?.[1] ?? (() => { throw new Error(`no thread ${t}`); })());
const GAP = 0.00025; // the slide fit's gap (room.ts FITS.slide)

// ---- the tables ----------------------------------------------------------------------------------------------------
/** ISO 6432 round cylinders by bore, mm: rod, its thread, the port thread, the nose's thread major (BE), and typical of
 *  makers' tables: the barrel's outside, each cap's length, the nose's length, the body at no stroke (caps and barrel),
 *  the rod out past the nose when in (WH), the piston's height and the longest stroke sold. */
export const ISO6432: Record<string, { rod: number; kk: string; port: string; be: number; od: number; cap: number; nose: number; L0: number; wh: number; hp: number; sMax: number }> = {
  '8': { rod: 4, kk: 'M4', port: 'M5', be: 12, od: 11, cap: 8, nose: 12, L0: 46, wh: 10, hp: 6, sMax: 100 }, '10': { rod: 4, kk: 'M4', port: 'M5', be: 12, od: 13, cap: 8, nose: 12, L0: 46, wh: 10, hp: 6, sMax: 160 },
  '12': { rod: 6, kk: 'M6', port: 'M5', be: 16, od: 15, cap: 9, nose: 17, L0: 50, wh: 13, hp: 7, sMax: 200 }, '16': { rod: 6, kk: 'M6', port: 'M5', be: 16, od: 19, cap: 10, nose: 17, L0: 56, wh: 13, hp: 8, sMax: 200 },
  '20': { rod: 8, kk: 'M8', port: 'G1/8', be: 22, od: 24, cap: 12, nose: 20, L0: 68, wh: 15, hp: 9, sMax: 320 }, '25': { rod: 10, kk: 'M10x1.25', port: 'G1/8', be: 22, od: 29, cap: 12, nose: 22, L0: 69, wh: 18, hp: 10, sMax: 500 },
};
/** The strokes ISO 6432 and ISO 15552 list, mm. */
export const STROKES = [10, 25, 40, 50, 80, 100, 125, 160, 200, 250, 320, 400, 500];
/** ISO 15552 profile cylinders by bore, mm: rod, its thread, the port, the square of its caps (E), the pitch of its four
 *  mounting threads (TG) and their thread, the body at no stroke (L8), the rod out when in (WH); typical: each cap's
 *  length, the bearing boss's diameter and height, the piston's height. */
export const ISO15552: Record<string, { rod: number; kk: string; port: string; E: number; tg: number; mt: number; L8: number; wh: number; cap: number; boss: number; bh: number; hp: number }> = {
  '32': { rod: 12, kk: 'M10x1.25', port: 'G1/8', E: 45, tg: 32.5, mt: 6, L8: 94, wh: 26, cap: 18, boss: 30, bh: 4, hp: 16 }, '40': { rod: 16, kk: 'M12x1.25', port: 'G1/4', E: 52, tg: 38, mt: 6, L8: 105, wh: 30, cap: 21, boss: 35, bh: 4, hp: 18 },
  '50': { rod: 20, kk: 'M16x1.5', port: 'G1/4', E: 65, tg: 46.5, mt: 8, L8: 106, wh: 37, cap: 22, boss: 40, bh: 4, hp: 20 }, '63': { rod: 20, kk: 'M16x1.5', port: 'G3/8', E: 75, tg: 56.5, mt: 8, L8: 121, wh: 37, cap: 25, boss: 45, bh: 4, hp: 22 },
  '80': { rod: 25, kk: 'M20x1.5', port: 'G3/8', E: 95, tg: 72, mt: 10, L8: 128, wh: 46, cap: 27, boss: 45, bh: 4, hp: 25 }, '100': { rod: 25, kk: 'M20x1.5', port: 'G1/2', E: 115, tg: 89, mt: 10, L8: 138, wh: 51, cap: 29, boss: 55, bh: 4, hp: 28 },
  '125': { rod: 32, kk: 'M27x2', port: 'G1/2', E: 140, tg: 110, mt: 12, L8: 160, wh: 65, cap: 35, boss: 60, bh: 6, hp: 32 },
};
/** ISO 6020-2 tie-rod hydraulic cylinders (160 bar), by bore, mm: its rod (the standard's first), the port, the square of
 *  its caps (E), the tie rods' pitch (TG) and diameter, the body at no stroke (ZJ − WH) and the rod out (WH): recalled,
 *  typical; each cap's length and the piston's height typical. */
export const ISO6020: Record<string, { rod: number; port: string; E: number; tg: number; tie: number; body: number; wh: number; cap: number; hp: number }> = {
  '25': { rod: 12, port: 'G1/4', E: 40, tg: 28.3, tie: 5, body: 99, wh: 15, cap: 18, hp: 14 }, '32': { rod: 14, port: 'G1/4', E: 45, tg: 33.2, tie: 6, body: 103, wh: 25, cap: 20, hp: 16 },
  '40': { rod: 18, port: 'G3/8', E: 63, tg: 41.7, tie: 8, body: 128, wh: 25, cap: 28, hp: 20 }, '50': { rod: 22, port: 'G1/2', E: 75, tg: 52.3, tie: 12, body: 134, wh: 25, cap: 32, hp: 22 },
  '63': { rod: 28, port: 'G1/2', E: 90, tg: 64.3, tie: 12, body: 136, wh: 32, cap: 34, hp: 25 }, '80': { rod: 36, port: 'G3/4', E: 115, tg: 82.7, tie: 16, body: 159, wh: 31, cap: 40, hp: 30 },
  '100': { rod: 45, port: 'G3/4', E: 130, tg: 96.9, tie: 16, body: 168, wh: 35, cap: 42, hp: 35 }, '125': { rod: 56, port: 'G1', E: 165, tg: 125.9, tie: 22, body: 197, wh: 35, cap: 50, hp: 45 },
  '160': { rod: 70, port: 'G1', E: 205, tg: 154.9, tie: 27, body: 213, wh: 32, cap: 55, hp: 55 }, '200': { rod: 90, port: 'G1-1/4', E: 245, tg: 190.2, tie: 30, body: 267, wh: 32, cap: 70, hp: 70 },
};
/** 5/2 single-solenoid valves by port, typical of makers' tables (after the 4V100 to 4V400 series): the body's length,
 *  height and width, the coil's, and the mounting holes' diameter, mm. */
export const VALVE52: Record<string, { L: number; H: number; W: number; cL: number; cH: number; cW: number; mount: number }> = {
  M5: { L: 61, H: 26, W: 18, cL: 28, cH: 28, cW: 19, mount: 3.2 }, 'G1/8': { L: 70, H: 32, W: 22, cL: 30, cH: 32, cW: 22, mount: 4.3 }, 'G1/4': { L: 76, H: 34, W: 24, cL: 30, cH: 32, cW: 22, mount: 4.3 },
  'G3/8': { L: 89, H: 39, W: 27, cL: 32, cH: 35, cW: 27, mount: 4.3 }, 'G1/2': { L: 108, H: 50, W: 35, cL: 34, cH: 38, cW: 30, mount: 5.3 },
};
/** Filter regulators by port, typical of makers' tables: the body's width (square) and height, the bowl's diameter and
 *  height, the bonnet's and the knob's diameter and height, mm. */
export const FILTERREG: Record<string, { W: number; H: number; bowl: number; bh: number; bon: number; bonH: number; knob: number; kh: number }> = {
  'G1/8': { W: 40, H: 40, bowl: 32, bh: 55, bon: 30, bonH: 14, knob: 28, kh: 18 }, 'G1/4': { W: 40, H: 42, bowl: 34, bh: 60, bon: 30, bonH: 14, knob: 28, kh: 18 },
  'G3/8': { W: 53, H: 52, bowl: 44, bh: 85, bon: 40, bonH: 18, knob: 38, kh: 22 }, 'G1/2': { W: 70, H: 60, bowl: 58, bh: 105, bon: 52, bonH: 20, knob: 48, kh: 24 },
  'G3/4': { W: 70, H: 62, bowl: 58, bh: 110, bon: 52, bonH: 20, knob: 48, kh: 24 }, G1: { W: 90, H: 76, bowl: 74, bh: 140, bon: 64, bonH: 24, knob: 58, kh: 28 },
};
/** Sintered bronze silencers by thread, typical: the thread's length, the hex, the sintered body's diameter and its length
 *  to the dome's end, mm. */
export const SILENCER: Record<string, { tl: number; af: number; d: number; L: number }> = {
  M5: { tl: 5, af: 8, d: 6, L: 10 }, 'G1/8': { tl: 6, af: 13, d: 10, L: 17 }, 'G1/4': { tl: 8, af: 17, d: 13.5, L: 22 }, 'G3/8': { tl: 9, af: 21, d: 16.5, L: 25 },
  'G1/2': { tl: 11, af: 26, d: 20, L: 31 }, 'G3/4': { tl: 12, af: 32, d: 26, L: 38 }, G1: { tl: 14, af: 40, d: 33, L: 44 },
};
/** Quick couplings of the ISO 6150 B profile by their male thread, typical of makers' tables: the hex, the body's and the
 *  locking sleeve's outside and length, the plug's nose outside and length, mm. */
export const QUICK: Record<string, { af: number; body: number; bl: number; sleeve: number; sl: number; nose: number; nl: number }> = {
  'G1/8': { af: 14, body: 15, bl: 12, sleeve: 20, sl: 18, nose: 8, nl: 16 }, 'G1/4': { af: 17, body: 18, bl: 14, sleeve: 24, sl: 21, nose: 9.9, nl: 20 },
  'G3/8': { af: 22, body: 22, bl: 16, sleeve: 28, sl: 24, nose: 12, nl: 23 }, 'G1/2': { af: 27, body: 27, bl: 18, sleeve: 34, sl: 28, nose: 15.9, nl: 27 },
};
/** Bourdon tube pressure gauges by their EN 837-1 nominal size (the case's diameter), bottom connection: its thread (EN
 *  837-1's), and typical: the case's depth, the stem's hex, the thread's length and the stem's block height, mm. */
export const GAUGE: Record<string, { port: string; depth: number; af: number; tl: number; neck: number }> = {
  '40': { port: 'G1/8', depth: 24, af: 12, tl: 10, neck: 8 }, '50': { port: 'G1/4', depth: 26, af: 14, tl: 13, neck: 9 }, '63': { port: 'G1/4', depth: 27, af: 14, tl: 13, neck: 10 },
  '80': { port: 'G1/4', depth: 30, af: 14, tl: 13, neck: 10 }, '100': { port: 'G1/2', depth: 32, af: 22, tl: 20, neck: 14 }, '160': { port: 'G1/2', depth: 48, af: 22, tl: 20, neck: 16 },
};
/** JIC 37° flare (SAE J514) by dash size: the thread's major (in) and threads an inch, the tube's outside (in); the hex
 *  (in) typical. */
export const JIC: Record<string, { major: number; tpi: number; tube: number; hex: number }> = {
  '-2': { major: 0.3125, tpi: 24, tube: 0.125, hex: 0.4375 }, '-3': { major: 0.375, tpi: 24, tube: 0.1875, hex: 0.5 }, '-4': { major: 0.4375, tpi: 20, tube: 0.25, hex: 0.5625 },
  '-5': { major: 0.5, tpi: 20, tube: 0.3125, hex: 0.625 }, '-6': { major: 0.5625, tpi: 18, tube: 0.375, hex: 0.6875 }, '-8': { major: 0.75, tpi: 16, tube: 0.5, hex: 0.875 },
  '-10': { major: 0.875, tpi: 14, tube: 0.625, hex: 1 }, '-12': { major: 1.0625, tpi: 12, tube: 0.75, hex: 1.25 }, '-14': { major: 1.1875, tpi: 12, tube: 0.875, hex: 1.375 },
  '-16': { major: 1.3125, tpi: 12, tube: 1, hex: 1.5 }, '-20': { major: 1.625, tpi: 12, tube: 1.25, hex: 2 }, '-24': { major: 1.875, tpi: 12, tube: 1.5, hex: 2.25 },
  '-32': { major: 2.5, tpi: 12, tube: 2, hex: 2.875 },
};
/** SAE 100R2AT (SAE J517) two-wire braided hydraulic hose by dash size, typical of makers' tables: its bore and outside,
 *  mm, and its working pressure, bar. */
export const R2AT: Record<string, { id: number; od: number; bar: number }> = {
  '-4': { id: 6.4, od: 15, bar: 400 }, '-5': { id: 7.9, od: 16.7, bar: 350 }, '-6': { id: 9.5, od: 19, bar: 330 }, '-8': { id: 12.7, od: 22.2, bar: 275 }, '-10': { id: 15.9, od: 25.4, bar: 250 },
  '-12': { id: 19, od: 29.3, bar: 215 }, '-16': { id: 25.4, od: 38.1, bar: 165 }, '-20': { id: 31.8, od: 48.3, bar: 125 }, '-24': { id: 38.1, od: 54.6, bar: 90 }, '-32': { id: 50.8, od: 67.3, bar: 80 },
};
/** ASME B1.20.1 NPT by size: the pipe's outside (in), threads an inch, the hand-tight engagement L1 and the effective
 *  thread L2 (in); and the class 150 malleable fittings round them (after ASME B16.3, typical as recalled): centre to end
 *  A (C for a 45° elbow), the least engagement B, the band's outside H, a coupling's length W, the hex or square of a nipple, plug or bushing
 *  (in). Sizes to 2 (larger fittings' bend radius A − B falls within their band: not drawn as a run yet). */
export const NPT: Record<string, { od: number; tpi: number; L1: number; L2: number; A: number; B: number; H: number; W: number; C: number; af: number }> = {
  '1/8': { od: 0.405, tpi: 27, L1: 0.18, L2: 0.2639, A: 0.69, B: 0.25, H: 0.693, W: 0.96, C: 0.61, af: 0.4375 }, '1/4': { od: 0.54, tpi: 18, L1: 0.2, L2: 0.4018, A: 0.81, B: 0.32, H: 0.844, W: 1.06, C: 0.73, af: 0.5625 },
  '3/8': { od: 0.675, tpi: 18, L1: 0.24, L2: 0.4078, A: 0.95, B: 0.36, H: 1.015, W: 1.16, C: 0.8, af: 0.6875 }, '1/2': { od: 0.84, tpi: 14, L1: 0.32, L2: 0.5337, A: 1.12, B: 0.43, H: 1.197, W: 1.34, C: 0.88, af: 0.875 },
  '3/4': { od: 1.05, tpi: 14, L1: 0.339, L2: 0.5457, A: 1.31, B: 0.5, H: 1.458, W: 1.52, C: 0.98, af: 1.0625 }, '1': { od: 1.315, tpi: 11.5, L1: 0.4, L2: 0.6828, A: 1.5, B: 0.58, H: 1.771, W: 1.67, C: 1.12, af: 1.375 },
  '1-1/4': { od: 1.66, tpi: 11.5, L1: 0.42, L2: 0.7068, A: 1.75, B: 0.67, H: 2.153, W: 1.93, C: 1.29, af: 1.75 }, '1-1/2': { od: 1.9, tpi: 11.5, L1: 0.42, L2: 0.7235, A: 1.94, B: 0.7, H: 2.427, W: 2.15, C: 1.43, af: 2 },
  '2': { od: 2.375, tpi: 11.5, L1: 0.436, L2: 0.7565, A: 2.25, B: 0.75, H: 2.963, W: 2.53, C: 1.68, af: 2.5 },
};
/** Compression fittings for EN 1057 copper tube, EN 1254-2's tube sizes, mm; typical of makers' tables: the body's thread
 *  major (its ends' outside), the nut's hex and length, the body's hex, an elbow's bend radius. */
export const COMPRESSION: Record<string, { thread: number; nut: number; nl: number; body: number; R: number }> = {
  '6': { thread: 10, nut: 12, nl: 9, body: 12, R: 7 }, '8': { thread: 12, nut: 14, nl: 10, body: 14, R: 8 }, '10': { thread: 14, nut: 17, nl: 11, body: 17, R: 9 },
  '12': { thread: 16, nut: 19, nl: 12, body: 19, R: 10 }, '15': { thread: 20, nut: 24, nl: 13, body: 22, R: 12 }, '18': { thread: 24, nut: 27, nl: 14, body: 27, R: 14 },
  '22': { thread: 28, nut: 32, nl: 15, body: 30, R: 16 }, '28': { thread: 35, nut: 38, nl: 17, body: 38, R: 20 }, '35': { thread: 43, nut: 47, nl: 20, body: 46, R: 24 },
  '42': { thread: 51, nut: 55, nl: 22, body: 54, R: 28 }, '54': { thread: 64, nut: 70, nl: 25, body: 68, R: 35 },
};
/** PEX tube, copper tube size (ASTM F876), by its nominal size: its outside (the nominal and 1/8 in) and wall (SDR 9, at
 *  least 0.070 in), in. */
export const PEX_CTS: Record<string, { od: number; t: number }> = Object.fromEntries((([['1/4', 0.375], ['3/8', 0.5], ['1/2', 0.625], ['5/8', 0.75], ['3/4', 0.875], ['1', 1.125], ['1-1/4', 1.375], ['1-1/2', 1.625], ['2', 2.125]] as const)).map(([k, od]) => [k, { od, t: Math.max(0.07, +(od / 9).toFixed(4)) }]));
/** Metric PEX and PE-RT tube (EN ISO 15875 sizes as sold), outside × wall, mm. */
export const PEX_METRIC: Record<string, [number, number]> = Object.fromEntries(['12x2', '14x2', '16x2', '16x2.2', '17x2', '18x2', '20x2', '20x2.8', '25x2.3', '25x3.5', '32x2.9', '32x4.4', '40x3.7', '50x4.6', '63x5.8'].map((k) => [k, k.split('x').map(Number) as [number, number]]));
/** PEX crimp rings (ASTM F1807, copper) by nominal size, typical of makers' tables: the ring's bore, outside and width, in. */
export const PEX_RING: Record<string, { id: number; od: number; w: number }> = {
  '3/8': { id: 0.53, od: 0.6, w: 0.3 }, '1/2': { id: 0.66, od: 0.74, w: 0.3 }, '5/8': { id: 0.79, od: 0.87, w: 0.3 }, '3/4': { id: 0.92, od: 1.0, w: 0.3 }, '1': { id: 1.18, od: 1.27, w: 0.3 },
};
/** PEX insert fittings (ASTM F1807, brass) by nominal size, typical: the insert's tail outside (the tube's bore), its
 *  waterway, the tail's length and the shoulder's outside, in. */
export const PEX_INSERT: Record<string, { tail: number; bore: number; L: number; shoulder: number }> = {
  '3/8': { tail: 0.35, bore: 0.25, L: 0.6, shoulder: 0.52 }, '1/2': { tail: 0.475, bore: 0.35, L: 0.65, shoulder: 0.65 }, '5/8': { tail: 0.574, bore: 0.44, L: 0.7, shoulder: 0.78 },
  '3/4': { tail: 0.671, bore: 0.53, L: 0.75, shoulder: 0.9 }, '1': { tail: 0.863, bore: 0.7, L: 0.85, shoulder: 1.15 },
};
/** Garden hose connectors (GHT, 3/4-11.5 NH: its major 1.0625 in) by the hose's bore, typical: the barbed shank's tail
 *  outside, waterway and length, mm. */
export const GHT_MAJOR = 1.0625;
export const GARDEN: Record<string, { tail: number; bore: number; L: number }> = { '1/2': { tail: 12.7, bore: 9, L: 25 }, '5/8': { tail: 15.9, bore: 11.5, L: 27 }, '3/4': { tail: 19, bore: 14, L: 30 } };
/** Bonded (Dowty) seals by ISO 228-1 thread, typical of makers' tables: the rubber's bore, the steel ring's bore and
 *  outside over the thread's major, and the thickness, mm. */
export const BONDED: Record<string, { ri: number; si: number; so: number; t: number }> = Object.fromEntries(['G1/8', 'G1/4', 'G3/8', 'G1/2', 'G5/8', 'G3/4', 'G1', 'G1-1/4', 'G1-1/2', 'G2'].map((g) => [g, { ri: 0.5, si: 3, so: g === 'G1/8' ? 5.5 : 7.5, t: majorOf(g) <= 21 ? 2.03 : 2.65 }]));

export const FLUID_SOURCES: Record<string, string> = {
  ISO6432: 'ISO 6432 bores, rods, rod threads, ports and nose threads as recalled; the bodies typical of makers\' tables (not read from a source here)',
  STROKES: 'the standard strokes ISO 6432 and ISO 15552 list, as recalled', ISO15552: 'ISO 15552 bores, rods, rod threads, ports, E, TG, L8 and WH as recalled; caps, boss and piston typical',
  ISO6020: 'ISO 6020-2 bores, first rods, ports, E, TG, tie rods and lengths as recalled (typical); caps and piston typical', VALVE52: 'typical of 5/2 solenoid valve makers\' tables (4V series proportions)',
  FILTERREG: 'typical of filter regulator makers\' tables', SILENCER: 'typical of sintered bronze silencer makers\' tables', QUICK: 'typical of ISO 6150 B quick coupling makers\' tables',
  GAUGE: 'EN 837-1 nominal sizes and connections as recalled; depths and stems typical', JIC: 'SAE J514 threads and tube sizes as recalled; hexes typical', R2AT: 'typical of SAE 100R2AT hose makers\' tables',
  NPT: 'ASME B1.20.1 outsides, threads an inch, L1 and L2 as recalled; ASME B16.3 class 150 proportions as recalled (typical)', COMPRESSION: 'EN 1254-2 tube sizes; bodies and nuts typical of makers\' tables',
  PEX_CTS: 'ASTM F876 copper tube size outsides and SDR 9 walls as recalled', PEX_METRIC: 'EN ISO 15875 sizes as sold (typical)', PEX_RING: 'typical of ASTM F1807 crimp ring makers\' tables',
  PEX_INSERT: 'typical of ASTM F1807 insert fitting makers\' tables', GHT_MAJOR: 'ANSI/ASME B1.20.7 garden hose thread 3/4-11.5 NH major, as recalled', GARDEN: 'typical of garden hose connector makers\' tables',
  BONDED: 'typical of bonded seal makers\' tables', R1AT: 'typical of SAE 100R1AT hose makers\' tables', ORFS: 'SAE J1453 threads and tube sizes as recalled; hexes typical', PPR: 'DIN 8077 walls as recalled', PE100: 'EN 12201-2 walls as recalled', GATE: 'EN 558 series 14 and EN 1092-1 PN16 as recalled; flange thicknesses typical',
  PUMP_ROWS: 'typical of 15 mm wet-rotor circulators (the 15-40 and 15-60 classes) and their makers\' charts: body, can and curve each typical, no maker\'s own table to hand', FLUID: 'the families made from the tables above, each saying its own source', FLUID_NODES: 'the families\' piece nodes, each card saying its own source',
};
export const FLUID_STATUS: Record<string, string> = Object.fromEntries(Object.keys(FLUID_SOURCES).map((k) => [k, 'estimated']));

// ---- cylinders: the piston and rod on a slide joint through the barrel -----------------------------------------------
const strokeSet = { key: 'stroke', label: 'Stroke, mm (a standard one)', type: 'choice' as const, default: '50', choices: STROKES.map(String) };
const strokeOf = (set: Record<string, unknown>) => mm(Number(set.stroke));
/** A piston and its rod on one slide joint (its stroke), the rod from the piston's top: what slides in the barrel. */
const pistonRod = (n: string, rp: number, hp: number, rr: number, Lr: number, s: number) => { const j = joint(`${n} stroke`, { slide: room(s) });
  return stack(`${n} piston and rod`, 1, [{ b: made(`${n} piston`, 'al-6061', { cyl: [rp, hp] }, { joint: j, color: BLACK }) }, { b: made(`${n} rod`, 'stainless-304', { cyl: [rr, Lr] }, { joint: j, color: 0xd8dade }) }]); };
type C6432 = (typeof ISO6432)[string];
const k6432 = (q: C6432, size: string, s: number) => { const b = mm(Number(size)), ro = mm(q.od) / 2, rr = mm(q.rod) / 2, rb = rr + mm(0.5), cap = mm(q.cap), Lb = mm(q.L0) - 2 * cap + s, rp = mm(majorOf(q.port)) / 2;
  return { b, ro, rr, rb, cap, Lb, rp, hp: mm(q.hp), nose: mm(q.nose), rn: mm(q.be) / 2, Lr: Lb - mm(q.hp) + cap + mm(q.nose) + mm(q.wh) }; };
const CYL6432: PartFamily<C6432> = {
  id: 'piece.cylinder6432', name: 'Pneumatic cylinder (ISO 6432)', gloss: 'A round double-acting air cylinder to ISO 6432, bore 8 to 25 mm, at a standard stroke: its piston and rod slide', domains: ['mechanical', 'pipelines', 'manufacturing'],
  aisle: 'Pneumatics / Cylinders',
  says: 'A double-acting round air cylinder to ISO 6432 (bore 8 to 25 mm; its rod, rod thread, ports and nose thread the standard\'s, its body typical) at a standard stroke: its rear cap, barrel, front cap and threaded nose stacked, its piston and rod on one slide joint of its stroke passed up the barrel (Through a line), drawn in. It moves: the rod slides out by its stroke. Each cap offers its port (`ISO 6432 Ø<bore> cylinder rear cap/port`, `…front cap/port`, along x, for a push-in fitting), the nose its axis (`…nose/axis`, for a nut or a mount over it), the rod its own (`…rod/axis`, for a clevis on its end). Approximated: threads, seals and cushions not drawn',
  rows: ISO6432, size: '16', source: 'ISO 6432 as recalled, bodies typical of makers\' tables (src/nexus/parts/fluid.ts ISO6432)',
  settings: [{ ...strokeSet, default: '50' }],
  cannot: (q, size, set) => { const s = Number(set.stroke); return !STROKES.includes(s) ? `a stroke ISO 6432 lists (${STROKES.join(', ')} mm; ${String(set.stroke)} asked)` : s > q.sMax ? `an ISO 6432 Ø${size} cylinder's stroke at most ${q.sMax} mm, as sold (${s} asked)` : null; },
  recipe: (q, size, set) => { const s = strokeOf(set), k = k6432(q, size, s), n = `ISO 6432 Ø${size} cylinder`;
    const port = (nm: string, ri: number) => ({ pattern: { name: 'port', points: [[0, 0]] as [number, number][], hole: k.rp, face: '+x' as const, depth: k.ro - ri }, color: ALU });
    const body = stack(n, 1, [{ b: made(`${n} rear cap`, 'al-6061', { cyl: [k.ro, k.cap] }, port('rear', 0)) }, { b: made(`${n} barrel`, 'stainless-304', { tube: [k.b / 2, k.ro, k.Lb] }, { color: 0xd8dade }) },
      { b: made(`${n} front cap`, 'al-6061', { tube: [k.rb, k.ro, k.cap] }, port('front', k.rb)) }, { b: made(`${n} nose`, 'al-6061', { tube: [k.rb, k.rn, k.nose] }, { color: ALU }) }]);
    return through(body, pistonRod(n, k.b / 2 - GAP, k.hp, k.rr, k.Lr, s), { port: `${n} barrel/axis`, from: 'lo' }, 'slide'); },
  expect: (q, size, set) => { const s = strokeOf(set), k = k6432(q, size, s), a = rho('al-6061'), st = rho('stainless-304'), w = Math.max(2 * k.ro, 2 * k.rn);
    return { bound: [w, 2 * k.cap + k.Lb + k.nose + mm(q.wh) + s, w], mass: (cylV(k.ro, k.cap) - cylV(k.rp, k.ro) + annV(k.rb, k.ro, k.cap) - cylV(k.rp, k.ro - k.rb) + annV(k.rb, k.rn, k.nose) + cylV(k.b / 2 - GAP, k.hp)) * a + (annV(k.b / 2, k.ro, k.Lb) + cylV(k.rr, k.Lr)) * st, tol: 0.01, massTol: 0.03,
      says: 'its widest by its length at full stroke (caps, barrel, nose, the rod out and its travel); nominal mass, each solid less its ports' }; },
  tests: [{ inputs: {}, outputs: { pieces: 6 } }],
};
/** A square-capped cylinder (ISO 15552, ISO 6020-2): its caps boxes of the square E, its barrel round between them, a
 *  port in each cap's +x face; ISO 15552's four mounting threads in each cap's outer face and its bearing boss, or ISO
 *  6020-2's four tie rods passed through both caps (their holes made by passing them); its piston and rod on a slide. */
type SqRow = { rod: number; port: string; E: number; tg: number; cap: number; hp: number; wh: number };
type SqOpts = { name: string; body: number; ro: number; mat: string; barrelMat: string; rodMat: string; mount?: number; boss?: [number, number]; tie?: number };
const sqOf = (q: SqRow, size: string, o: SqOpts, s: number) => { const b = mm(Number(size)), E = mm(q.E), cap = mm(q.cap), Lb = mm(o.body) - 2 * cap + s, rr = mm(q.rod) / 2, rp = mm(majorOf(q.port)) / 2, bh = o.boss ? mm(o.boss[1]) : 0;
  return { b, E, cap, Lb, rr, rp, hp: mm(q.hp), bh, rboss: o.boss ? mm(o.boss[0]) / 2 : 0, a: mm(q.tg) / 2, Lr: Lb - mm(q.hp) + cap + mm(q.wh), dFront: E / 2 - rr - mm(1) }; };
function squareCylinder(q: SqRow, size: string, o: SqOpts, s: number): Block {
  const k = sqOf(q, size, o, s), n = o.name, corners: [number, number][] = [[-k.a, -k.a], [k.a, -k.a], [k.a, k.a], [-k.a, k.a]];
  const fixings = (face: '+y' | '-y') => (o.mount ? [{ name: 'mounting', points: corners, hole: mm(o.mount) / 2, face, depth: 0.6 * k.cap }] : face === '-y' && o.tie ? [{ name: 'tie rods', points: corners }] : []);
  const rear = made(`${n} rear cap`, o.mat, { box: [k.E, k.cap, k.E] }, { color: o.mat === 'al-6061' ? ALU : STEEL, patterns: [{ name: 'port', points: [[0, 0]], hole: k.rp, face: '+x', depth: k.E / 2 }, ...fixings('-y')] });
  const front = made(`${n} front cap`, o.mat, { box: [k.E, k.cap, k.E] }, { color: o.mat === 'al-6061' ? ALU : STEEL, patterns: [{ name: 'port', points: [[0, 0]], hole: k.rp, face: '+x', depth: k.dFront }, ...fixings('+y')] });
  const parts = [{ b: rear }, { b: made(`${n} barrel`, o.barrelMat, { tube: [k.b / 2, mm(o.ro), k.Lb] }, { color: 0xd8dade }) }, { b: front }, ...(o.boss ? [{ b: made(`${n} boss`, o.mat, { cyl: [k.rboss, k.bh] }, { color: ALU }) }] : [])];
  let body = stack(n, 1, parts);
  if (o.tie) for (let i = 0; i < 4; i++) body = through(body, made(`${n} tie rod ${i + 1}`, 'steel-alloy', { cyl: [mm(o.tie) / 2, 2 * k.cap + k.Lb] }, { color: STEEL }), { port: `${n} rear cap/tie rods`, i, from: 'lo' }, 'tight');
  const rod = pistonRod(n, k.b / 2 - GAP, k.hp, k.rr, k.Lr, s);
  return through(body, rod, { port: `${n} barrel/axis`, from: 'lo' }, 'slide');
}
function squareExpect(q: SqRow, size: string, o: SqOpts, s: number): Expect {
  const k = sqOf(q, size, o, s), m = rho(o.mat), fix = o.mount ? 4 * cylV(mm(o.mount) / 2, 0.6 * k.cap) : o.tie ? 4 * cylV(mm(o.tie) / 2, k.cap) : 0, rc = k.rr + GAP;
  const caps = (2 * k.E * k.E * k.cap - cylV(k.rp, k.E / 2) - cylV(k.rp, k.dFront) - 2 * fix - cylV(rc, k.cap)) * m + (o.boss ? (cylV(k.rboss, k.bh) - cylV(rc, k.bh)) * m : 0);
  const mass = caps + annV(k.b / 2, mm(o.ro), k.Lb) * rho(o.barrelMat) + cylV(k.b / 2 - GAP, k.hp) * rho('al-6061') + cylV(k.rr, k.Lr) * rho(o.rodMat) + (o.tie ? 4 * cylV(mm(o.tie) / 2, 2 * k.cap + k.Lb) * rho('steel-alloy') : 0);
  return { bound: [k.E, 2 * k.cap + k.Lb + mm(q.wh) + s, k.E], mass, tol: 0.01, massTol: 0.03, says: 'its caps\' square by its length at full stroke (body, the rod out by WH and its travel); nominal mass, caps less their ports, fixings and the rod\'s bore, barrel, piston, rod and tie rods' };
}
type C15552 = (typeof ISO15552)[string];
const o15552 = (q: C15552, size: string): SqOpts => ({ name: `ISO 15552 Ø${size} cylinder`, body: q.L8, ro: q.E / 2 - 2, mat: 'al-6061', barrelMat: 'al-6061', rodMat: 'stainless-304', mount: q.mt, boss: [q.boss, q.bh] });
const CYL15552: PartFamily<C15552> = {
  id: 'piece.cylinder15552', name: 'Pneumatic cylinder (ISO 15552)', gloss: 'A double-acting profile air cylinder to ISO 15552, bore 32 to 125 mm, at a standard stroke: its piston and rod slide', domains: ['mechanical', 'pipelines', 'manufacturing'],
  aisle: 'Pneumatics / Cylinders',
  says: 'A double-acting air cylinder to ISO 15552 (bore 32 to 125 mm; its rod, rod thread, ports, square E, mounting pitch TG and length L8 the standard\'s as recalled) at a standard stroke: its square rear cap, its barrel, its square front cap and bearing boss stacked, its piston and rod on one slide joint of its stroke passed up the barrel (Through a line), the rod boring the front cap and boss as it passes. It moves: the rod slides out by its stroke. It offers each cap\'s port (`ISO 15552 Ø<bore> cylinder rear cap/port`, `…front cap/port`, along x), each cap\'s four mounting threads (`…rear cap/mounting`, `…front cap/mounting`, for a foot or flange bolted on) and the rod\'s axis (`…rod/axis`). Approximated: its profile barrel drawn round, threads, seals and cushions not drawn',
  rows: ISO15552, size: '50', source: 'ISO 15552 as recalled, caps and boss typical (src/nexus/parts/fluid.ts ISO15552)',
  settings: [{ ...strokeSet, default: '100' }],
  cannot: (_q, _s, set) => (STROKES.includes(Number(set.stroke)) && Number(set.stroke) >= 25 ? null : `a stroke ISO 15552 lists, 25 to 500 mm (${String(set.stroke)} asked)`),
  recipe: (q, size, set) => squareCylinder(q, size, o15552(q, size), strokeOf(set)),
  expect: (q, size, set) => squareExpect(q, size, o15552(q, size), strokeOf(set)),
  tests: [{ inputs: {}, outputs: { pieces: 6 } }],
};
type C6020 = (typeof ISO6020)[string];
const o6020 = (q: C6020, size: string): SqOpts => ({ name: `ISO 6020-2 Ø${size} cylinder`, body: q.body, ro: Number(size) / 2 + 0.06 * Number(size) + 2, mat: 'steel-low', barrelMat: 'steel-low', rodMat: 'steel-alloy', tie: q.tie });
const HYDCYL: PartFamily<C6020> = {
  id: 'piece.hydcylinder', name: 'Hydraulic cylinder (ISO 6020-2)', gloss: 'A tie-rod hydraulic cylinder to ISO 6020-2 (160 bar), bore 25 to 200 mm, at a stroke: its piston and rod slide', domains: ['mechanical', 'pipelines', 'manufacturing'],
  aisle: 'Hydraulics / Cylinders',
  says: 'A double-acting tie-rod hydraulic cylinder to ISO 6020-2 (160 bar; bore 25 to 200 mm, its first rod, ports, square E, tie-rod pitch TG and lengths as recalled, typical) at a stroke: its square rear cap, barrel and front cap stacked, its four tie rods passed through both caps (Through a line, making their holes), its piston and rod on one slide joint of its stroke passed up the barrel, the rod boring the front cap. It moves: the rod slides out by its stroke. It offers each cap\'s port (`ISO 6020-2 Ø<bore> cylinder rear cap/port`, `…front cap/port`, along x, for a JIC or BSP adaptor) and the rod\'s axis (`…rod/axis`). Approximated: the tie rods\' nuts, threads, seals and cushions not drawn',
  rows: ISO6020, size: '50', source: 'ISO 6020-2 as recalled, typical (src/nexus/parts/fluid.ts ISO6020)',
  settings: [{ key: 'stroke', label: 'Stroke, mm', type: 'number', default: 100 }],
  cannot: (q, _size, set) => { const s = Number(set.stroke); return !(s >= 10 && s <= 2000) ? `a stroke of 10 to 2000 mm, as sold (${String(set.stroke)} asked)` : q.body - 2 * q.cap < q.hp ? `its body (${q.body} mm) leaves no room for its piston` : null; },
  recipe: (q, size, set) => squareCylinder(q, size, o6020(q, size), strokeOf(set)),
  expect: (q, size, set) => squareExpect(q, size, o6020(q, size), strokeOf(set)),
  tests: [{ inputs: {}, outputs: { pieces: 9 } }],
};

// ---- valves, air preparation, silencers, couplings, gauges --------------------------------------------------------
type V52 = (typeof VALVE52)[string];
const v52 = (q: V52, size: string) => ({ L: mm(q.L), H: mm(q.H), W: mm(q.W), rt: mm(majorOf(size)) / 2, rm: mm(q.mount) / 2, xm: mm(q.L) / 2 - 1.5 * mm(q.mount) });
const VALVE: PartFamily<V52> = {
  id: 'piece.valve52', name: 'Solenoid valve 5/2', gloss: 'A 5/2 single-solenoid air valve by its port, M5 to G1/2: its body with five ports and its coil', domains: ['mechanical', 'pipelines', 'electrical'],
  aisle: 'Pneumatics / Valves',
  says: 'A 5/2 single-solenoid air valve by its port thread (M5 to G1/2; typical of makers\' tables): its body with its two work ports (2, 4) in its top face and its supply and two exhausts (1, 3, 5) in its bottom face, two mounting holes through it, its coil onto its +x end. It offers `5/2 valve <port> body/work ports`, `…body/supply ports` (each a line into its face, for a push-in fitting or a silencer) and `…body/mounting` (through, for two screws). Approximated: its spool, seals and pilot not drawn, its coil drawn as its housing, solid',
  rows: VALVE52, size: 'G1/8', source: 'typical of 5/2 valve makers\' tables (src/nexus/parts/fluid.ts VALVE52)',
  recipe: (q, size) => { const k = v52(q, size), n = `5/2 valve ${size}`;
    const body = made(`${n} body`, 'al-6061', { box: [k.L, k.H, k.W] }, { color: ALU, patterns: [{ name: 'work ports', points: [[-k.L / 6, 0], [k.L / 6, 0]], hole: k.rt, face: '+y', depth: 0.45 * k.H },
      { name: 'supply ports', points: [[-k.L / 4, 0], [0, 0], [k.L / 4, 0]], hole: k.rt, face: '-y', depth: 0.45 * k.H }, { name: 'mounting', points: [[-k.xm, 0], [k.xm, 0]], hole: k.rm, face: '+z' }] });
    return onto(body, '+x', made(`${n} coil`, 'pbt', { box: [mm(q.cL), mm(q.cH), mm(q.cW)] }, { color: BLACK })); },
  expect: (q, size) => { const k = v52(q, size);
    return { bound: [k.L + mm(q.cL), Math.max(k.H, mm(q.cH)), Math.max(k.W, mm(q.cW))], mass: (k.L * k.H * k.W - 5 * cylV(k.rt, 0.45 * k.H) - 2 * cylV(k.rm, k.W)) * rho('al-6061') + mm(q.cL) * mm(q.cH) * mm(q.cW) * rho('pbt'), tol: 0.01, massTol: 0.03, says: 'its body and coil end to end (typical); nominal mass, the body less its ports and holes, the coil solid' }; },
  tests: [{ inputs: {}, outputs: { pieces: 2, offers: ['5/2 valve G1/8 body/mounting', '5/2 valve G1/8 body/supply ports', '5/2 valve G1/8 body/work ports'] } }],
};
type FR = (typeof FILTERREG)[string];
const frOf = (q: FR, size: string) => ({ W: mm(q.W), H: mm(q.H), rt: mm(majorOf(size)) / 2, rb: mm(q.bowl) / 2, bh: mm(q.bh), wall: mm(2.5), floor: mm(3), rn: mm(q.bon) / 2, hn: mm(q.bonH), rk: mm(q.knob) / 2, hk: mm(q.kh) });
const FILTERREGULATOR: PartFamily<FR> = {
  id: 'piece.filterregulator', name: 'Filter regulator', gloss: 'An air filter regulator by its port, G1/8 to G1: its bowl, body, bonnet and knob', domains: ['mechanical', 'pipelines'],
  aisle: 'Pneumatics / Air preparation',
  says: 'An air filter regulator by its port thread (G1/8 to G1; typical of makers\' tables): its clear bowl hung under its body (a cup, its cavity closed by the body), its body with its in and out ports in its −x and +x faces, its bonnet and adjusting knob stacked on top. It offers `filter regulator <port> body/in port` and `…body/out port` (lines into its faces, for a nipple or a push-in fitting). Approximated: its element, diaphragm, spring and gauge port not drawn',
  rows: FILTERREG, size: 'G1/4', source: 'typical of filter regulator makers\' tables (src/nexus/parts/fluid.ts FILTERREG)',
  recipe: (q, size) => { const k = frOf(q, size), n = `filter regulator ${size}`;
    const body = made(`${n} body`, 'zinc', { box: [k.W, k.H, k.W] }, { color: ZINC, patterns: [{ name: 'in port', points: [[0, 0]], hole: k.rt, face: '-x', depth: 0.4 * k.W }, { name: 'out port', points: [[0, 0]], hole: k.rt, face: '+x', depth: 0.4 * k.W }] });
    return stack(n, 1, [{ b: made(`${n} bowl`, 'pc', { cup: [k.rb, k.bh, k.wall, k.floor] }, { color: CLEAR }) }, { b: body }, { b: made(`${n} bonnet`, 'abs', { cyl: [k.rn, k.hn] }, { color: BLACK }) }, { b: made(`${n} knob`, 'abs', { cyl: [k.rk, k.hk] }, { color: BLUE }) }]); },
  expect: (q, size) => { const k = frOf(q, size), w = Math.max(k.W, 2 * k.rb, 2 * k.rn, 2 * k.rk);
    return { bound: [w, k.bh + k.H + k.hn + k.hk, w], mass: cupV(k.rb, k.bh, k.wall, k.floor) * rho('pc') + (k.W * k.H * k.W - 2 * cylV(k.rt, 0.4 * k.W)) * rho('zinc') + (cylV(k.rn, k.hn) + cylV(k.rk, k.hk)) * rho('abs'), tol: 0.01, massTol: 0.03, says: 'its bowl, body, bonnet and knob stacked (typical); nominal mass, each solid less its ports' }; },
  tests: [{ inputs: {}, outputs: { pieces: 4 } }],
};
type Sil = (typeof SILENCER)[string];
const silOf = (q: Sil, size: string) => { const d = majorOf(size); return { rt: mm(d) / 2, rb: mm(0.3 * d), tl: mm(q.tl), af: mm(q.af), hh: mm(0.35 * q.af), r: mm(q.d) / 2, L: mm(q.L) }; };
const SILENCERS: PartFamily<Sil> = {
  id: 'piece.silencer', name: 'Exhaust silencer', gloss: 'A sintered bronze exhaust silencer by its thread, M5 to G1', domains: ['mechanical', 'pipelines'],
  aisle: 'Pneumatics / Silencers',
  says: 'A sintered bronze exhaust silencer by its male thread (M5 to G1; typical of makers\' tables): its thread, its hex and its sintered body with its domed end, stacked. Its thread offers its axis (`<thread> silencer thread/axis`), for a valve\'s exhaust port. Approximated: its pores not drawn (drawn and weighed solid bronze), the thread not drawn',
  rows: SILENCER, size: 'G1/8', source: 'typical of silencer makers\' tables (src/nexus/parts/fluid.ts SILENCER)',
  recipe: (q, size) => { const k = silOf(q, size), n = `${size} silencer`;
    return stack(n, 1, [{ b: made(`${n} thread`, 'brass', { tube: [k.rb, k.rt, k.tl] }, { color: BRASS }) }, { b: made(`${n} hex`, 'brass', { hex: [k.af, k.hh, k.rb] }, { color: BRASS }) }, { b: made(`${n} body`, 'bronze', { cyl: [k.r, k.L - k.r] }, { color: 0x9c7a4a }) }, { b: made(`${n} dome`, 'bronze', { dome: [k.r] }, { color: 0x9c7a4a }) }]); },
  expect: (q, size) => { const k = silOf(q, size), w = Math.max(cor(k.af), 2 * k.r);
    return { bound: [w, k.tl + k.hh + k.L, w], mass: (annV(k.rb, k.rt, k.tl) + hexV(k.af, k.hh, k.rb)) * rho('brass') + (cylV(k.r, k.L - k.r) + (2 / 3) * Math.PI * k.r ** 3) * rho('bronze'), tol: 0.01, massTol: 0.03, says: 'its hex or body across by its length (typical); nominal mass, thread, hex, body and dome solid' }; },
  tests: [{ inputs: {}, outputs: { pieces: 4 } }],
};
type Q = (typeof QUICK)[string];
const qOf = (q: Q, size: string) => { const d = majorOf(size); return { rt: mm(d) / 2, rb: mm(0.3 * d), tl: mm(0.6 * d + 2), af: mm(q.af), hh: mm(0.4 * q.af), rB: mm(q.body) / 2, bl: mm(q.bl), rs: mm(q.sleeve) / 2, sl: mm(q.sl), rn: mm(q.nose) / 2, nl: mm(q.nl) }; };
const QCOUPLER: PartFamily<Q> = {
  id: 'piece.qcoupler', name: 'Quick coupler (ISO 6150 B)', gloss: 'A quick coupling socket of the ISO 6150 B profile by its male thread, G1/8 to G1/2', domains: ['mechanical', 'pipelines'],
  aisle: 'Pneumatics / Couplings',
  says: 'A quick coupling socket (the ISO 6150 B profile; its sizes typical of makers\' tables) by its male thread, G1/8 to G1/2: its thread, hex, body and locking sleeve stacked. Its sleeve offers its axis (`<thread> coupler sleeve/axis`, its bore the plug\'s nose, for a plug into it), its thread its own (for a port). Approximated: its balls, valve and spring not drawn, the thread not drawn',
  rows: QUICK, size: 'G1/4', source: 'typical of ISO 6150 B coupling makers\' tables (src/nexus/parts/fluid.ts QUICK)',
  recipe: (q, size) => { const k = qOf(q, size), n = `${size} coupler`;
    return stack(n, 1, [{ b: made(`${n} thread`, 'brass', { tube: [k.rb, k.rt, k.tl] }, { color: BRASS }) }, { b: made(`${n} hex`, 'brass', { hex: [k.af, k.hh, k.rb] }, { color: BRASS }) }, { b: made(`${n} body`, 'brass', { tube: [k.rb, k.rB, k.bl] }, { color: BRASS }) }, { b: made(`${n} sleeve`, 'steel-low', { tube: [k.rn + GAP, k.rs, k.sl] }, { color: STEEL }) }]); },
  expect: (q, size) => { const k = qOf(q, size), w = Math.max(cor(k.af), 2 * k.rB, 2 * k.rs);
    return { bound: [w, k.tl + k.hh + k.bl + k.sl, w], mass: (annV(k.rb, k.rt, k.tl) + hexV(k.af, k.hh, k.rb) + annV(k.rb, k.rB, k.bl)) * rho('brass') + annV(k.rn + GAP, k.rs, k.sl) * rho('steel-low'), tol: 0.01, massTol: 0.03, says: 'its widest by its length (typical); nominal mass, each tube and its hex' }; },
  tests: [{ inputs: {}, outputs: { pieces: 4 } }],
};
const QPLUG: PartFamily<Q> = {
  id: 'piece.qplug', name: 'Quick coupling plug (ISO 6150 B)', gloss: 'A quick coupling plug of the ISO 6150 B profile by its male thread, G1/8 to G1/2', domains: ['mechanical', 'pipelines'],
  aisle: 'Pneumatics / Couplings',
  says: 'A quick coupling plug (nipple; the ISO 6150 B profile, its sizes typical of makers\' tables) by its male thread, G1/8 to G1/2: its thread, hex and nose stacked. Its nose offers its axis (`<thread> plug nose/axis`): it goes into a coupler\'s sleeve. Approximated: its locking groove not drawn, the thread not drawn',
  rows: QUICK, size: 'G1/4', source: 'typical of ISO 6150 B coupling makers\' tables (src/nexus/parts/fluid.ts QUICK)',
  recipe: (q, size) => { const k = qOf(q, size), n = `${size} plug`;
    return stack(n, 1, [{ b: made(`${n} thread`, 'steel-low', { tube: [k.rb, k.rt, k.tl] }, { color: STEEL }) }, { b: made(`${n} hex`, 'steel-low', { hex: [k.af, k.hh, k.rb] }, { color: STEEL }) }, { b: made(`${n} nose`, 'steel-low', { tube: [k.rb, k.rn, k.nl] }, { color: STEEL }) }]); },
  expect: (q, size) => { const k = qOf(q, size), w = Math.max(cor(k.af), 2 * k.rn);
    return { bound: [w, k.tl + k.hh + k.nl, w], mass: (annV(k.rb, k.rt, k.tl) + hexV(k.af, k.hh, k.rb) + annV(k.rb, k.rn, k.nl)) * rho('steel-low'), tol: 0.01, massTol: 0.03, says: 'its hex across by its length (typical); nominal mass, each tube and its hex' }; },
  tests: [{ inputs: {}, outputs: { pieces: 3 } }],
};
type G = (typeof GAUGE)[string];
const gOf = (q: G, size: string) => ({ R: mm(Number(size)) / 2, depth: mm(q.depth), wall: mm(1), floor: mm(1.5), win: mm(2), rt: mm(majorOf(q.port)) / 2, rb: mm(1.25), tl: mm(q.tl), af: mm(q.af), hh: mm(0.5 * q.af), neck: mm(q.neck) });
const GAUGES: PartFamily<G> = {
  id: 'piece.gauge', name: 'Pressure gauge (EN 837-1)', gloss: 'A Bourdon tube pressure gauge by its EN 837-1 size, 40 to 160 mm, bottom connection', domains: ['mechanical', 'pipelines'],
  aisle: 'Pneumatics / Gauges',
  says: 'A Bourdon tube pressure gauge by its EN 837-1 nominal size (40 to 160 mm, its connection the standard\'s: G1/8, G1/4 or G1/2), bottom connection: its thread, hex and stem block stacked, its case (a cup with its window on its rim) turned to face +z on top. Its thread offers its axis (`<size> mm gauge thread/axis`), for a regulator\'s or a manifold\'s gauge port. Approximated: its Bourdon tube, movement, dial and pointer inside not drawn, the thread not drawn',
  rows: GAUGE, size: '63', source: 'EN 837-1 sizes and connections as recalled; depths and stems typical (src/nexus/parts/fluid.ts GAUGE)',
  recipe: (q, size) => { const k = gOf(q, size), n = `${size} mm gauge`;
    const stem = stack(`${n} stem`, 1, [{ b: made(`${n} thread`, 'brass', { tube: [k.rb, k.rt, k.tl] }, { color: BRASS }) }, { b: made(`${n} hex`, 'brass', { hex: [k.af, k.hh, k.rb] }, { color: BRASS }) }, { b: made(`${n} block`, 'brass', { cyl: [k.af / 2, k.neck] }, { color: BRASS }) }]);
    const face = turn(stack(`${n} case`, 1, [{ b: made(`${n} case`, 'stainless-304', { cup: [k.R, k.depth, k.wall, k.floor] }, { color: 0xd8dade }) }, { b: made(`${n} window`, 'pc', { cyl: [k.R, k.win] }, { color: CLEAR }) }]), 0, 90);
    return stack(n, 1, [{ b: stem }, { b: face }]); },
  expect: (q, size) => { const k = gOf(q, size);
    return { bound: [Math.max(2 * k.R, cor(k.af)), k.tl + k.hh + k.neck + 2 * k.R, Math.max(k.depth + k.win, cor(k.af))], mass: (annV(k.rb, k.rt, k.tl) + hexV(k.af, k.hh, k.rb) + cylV(k.af / 2, k.neck)) * rho('brass') + cupV(k.R, k.depth, k.wall, k.floor) * rho('stainless-304') + cylV(k.R, k.win) * rho('pc'), tol: 0.01, massTol: 0.03, says: 'its case across, its stem and case high, its case and window deep; nominal mass, stem, case and window' }; },
  tests: [{ inputs: {}, outputs: { pieces: 5 } }],
};

// ---- runs of fittings: an elbow (an end, a bend, an end), a tee (a run and a branch into its side) -------------------
type Tube = { ri: number; ro: number };
const seg = (name: string, mat: string, color: number, t: Tube, L: number): RunSeg => ({ name, mat, color, ri: t.ri, ro: t.ro, straight: L });
const elbowOf = (n: string, mat: string, color: number, end: Tube, L: number, body: Tube, R: number, deg = 90) =>
  run(n, [seg(`${n} end 1`, mat, color, end, L), { name: `${n} body`, mat, color, ri: body.ri, ro: body.ro, bend: deg, R }, seg(`${n} end 2`, mat, color, end, L)]);
const teeOf = (n: string, mat: string, color: number, end: Tube, L: number, body: Tube, hostL: number, branchL: number) =>
  branch(run(n, [seg(`${n} end 1`, mat, color, end, L), seg(`${n} body`, mat, color, body, hostL), seg(`${n} end 2`, mat, color, end, L)]), `${n} body/axis`, run(`${n} branch`, [seg(`${n} branch body`, mat, color, body, branchL), seg(`${n} end 3`, mat, color, end, L)]), 0);
/** an elbow's bound: its ends L long, its body ro about its bend R (the ends no wider than the body) */
const elbowBound = (L: number, ro: number, R: number): [number, number, number] => [ro + R + L, L + R + ro, 2 * ro];
/** a tee's bound: its run (ends L, body hostL) and its branch (body branchL, an end L) */
const teeBound = (L: number, ro: number, hostL: number, branchL: number): [number, number, number] => [ro + branchL + L, 2 * L + hostL, 2 * ro];
const TEE_SAYS = 'a tee\'s nominal mass not held: the drawing weighs Branch\'s cuts whole (a fault of the drawing, plumbing.ts, left open)';

// ---- JIC 37° (SAE J514) -------------------------------------------------------------------------------------------
type Jic = (typeof JIC)[string];
const jk = (q: Jic) => { const rt = inch(q.major) / 2, rb = 0.35 * inch(q.tube), rBase = 0.85 * rt, rTip = rb + mm(0.4), af = inch(q.hex);
  return { rt, rb, Lm: 0.9 * inch(q.major) + mm(4), rBase, rTip, hc: (rBase - rTip) / Math.tan((37 * Math.PI) / 180), af, hh: 0.45 * af, ro: af / 2, R: af / 2 + mm(1), Lc: 0.8 * (0.9 * inch(q.major) + mm(4)) }; };
const JIC_SRC = 'SAE J514 threads and tube sizes as recalled, hexes and lengths typical (src/nexus/parts/fluid.ts JIC)';
const JIC_SAYS = 'by its dash size (-2 to -32; its thread and tube the standard\'s, its hex and lengths typical); its 37° flare nose a cone at each male end, its threads not drawn';
const steel = (n: string, s: Parameters<typeof made>[2]) => made(n, 'steel-low', s, { color: STEEL });
const JICUNION: PartFamily<Jic> = {
  id: 'piece.jicunion', name: 'JIC union (SAE J514)', gloss: 'A JIC 37° male union by its dash size, -2 to -32', domains: ['mechanical', 'pipelines'], aisle: 'Hydraulics / JIC fittings',
  says: `A JIC 37° straight male union ${JIC_SAYS}: its flare nose, its male end, its hex, its other end and nose stacked. Each end offers its axis (\`JIC <dash> union end 1/axis\`, \`…end 2/axis\`), for a swivel nut or a cap over it`,
  rows: JIC, size: '-8', source: JIC_SRC,
  recipe: (q, size) => { const k = jk(q), n = `JIC ${size} union`;
    return stack(n, 1, [{ b: steel(`${n} nose 1`, { cone: [k.rTip, k.rBase, k.hc, k.rb] }) }, { b: steel(`${n} end 1`, { tube: [k.rb, k.rt, k.Lm] }) }, { b: steel(`${n} hex`, { hex: [k.af, k.hh, k.rb] }) }, { b: steel(`${n} end 2`, { tube: [k.rb, k.rt, k.Lm] }) }, { b: steel(`${n} nose 2`, { cone: [k.rBase, k.rTip, k.hc, k.rb] }) }]); },
  expect: (q) => { const k = jk(q); return { bound: [cor(k.af), 2 * k.hc + 2 * k.Lm + k.hh, cor(k.af)], mass: (2 * coneV(k.rTip, k.rBase, k.hc, k.rb) + 2 * annV(k.rb, k.rt, k.Lm) + hexV(k.af, k.hh, k.rb)) * rho('steel-low'), tol: 0.01, massTol: 0.03, says: 'its hex across by its noses, ends and hex; nominal mass, each solid' }; },
  tests: [{ inputs: {}, outputs: { pieces: 5 } }],
};
const JICELBOW: PartFamily<Jic> = {
  id: 'piece.jicelbow', name: 'JIC elbow (SAE J514)', gloss: 'A JIC 37° 90° male elbow by its dash size, -2 to -32', domains: ['mechanical', 'pipelines'], aisle: 'Hydraulics / JIC fittings',
  says: `A JIC 37° 90° male elbow ${JIC_SAYS}, laid as a run: its male end, its body bent through 90° (drawn round, its forging's flats not drawn), its other end; its noses not drawn on an elbow. Each end offers its axis (\`JIC <dash> elbow end 1/axis\`, \`…end 2/axis\`)`,
  rows: JIC, size: '-8', source: JIC_SRC,
  recipe: (q, size) => { const k = jk(q); return elbowOf(`JIC ${size} elbow`, 'steel-low', STEEL, { ri: k.rb, ro: k.rt }, k.Lm, { ri: k.rb, ro: k.ro }, k.R); },
  expect: (q) => { const k = jk(q); return { bound: elbowBound(k.Lm, k.ro, k.R), mass: (2 * annV(k.rb, k.rt, k.Lm) + bendV(k.rb, k.ro, k.R, 90)) * rho('steel-low'), tol: 0.01, massTol: 0.03, says: 'its reach each way and its body across; nominal mass, its ends and bend' }; },
  tests: [{ inputs: {}, outputs: { pieces: 3, offers: ['JIC -8 elbow end 1/axis', 'JIC -8 elbow end 2/axis'] } }],
};
const JICTEE: PartFamily<Jic> = {
  id: 'piece.jictee', name: 'JIC tee (SAE J514)', gloss: 'A JIC 37° male tee by its dash size, -2 to -32', domains: ['mechanical', 'pipelines'], aisle: 'Hydraulics / JIC fittings',
  says: `A JIC 37° male tee ${JIC_SAYS}, laid as a run of its two ends and body, its branch joined into its side (Branch into a side); its noses not drawn on a tee. Each end offers its axis (\`JIC <dash> tee end 1/axis\`, \`…end 2/axis\`, \`…end 3/axis\`)`,
  rows: JIC, size: '-8', source: JIC_SRC,
  recipe: (q, size) => { const k = jk(q); return teeOf(`JIC ${size} tee`, 'steel-low', STEEL, { ri: k.rb, ro: k.rt }, k.Lm, { ri: k.rb, ro: k.ro }, 2 * k.ro + mm(2), k.ro + mm(1)); },
  expect: (q) => { const k = jk(q); return { bound: teeBound(k.Lm, k.ro, 2 * k.ro + mm(2), k.ro + mm(1)), tol: 0.01, says: `its run and branch; ${TEE_SAYS}` }; },
  tests: [{ inputs: {}, outputs: { pieces: 5 } }],
};
const JICCAP: PartFamily<Jic> = {
  id: 'piece.jiccap', name: 'JIC cap (SAE J514)', gloss: 'A JIC 37° cap nut by its dash size, -2 to -32', domains: ['mechanical', 'pipelines'], aisle: 'Hydraulics / JIC fittings',
  says: `A JIC 37° cap ${JIC_SAYS}: its hex, its bore the thread's major, closed by its hex top. Its bore offers its axis (\`JIC <dash> cap/axis\`): it goes over a male end`,
  rows: JIC, size: '-8', source: JIC_SRC,
  recipe: (q, size) => { const k = jk(q), n = `JIC ${size} cap`; return stack(n, 1, [{ b: steel(n, { hex: [k.af, k.Lc, k.rt] }) }, { b: steel(`${n} top`, { hex: [k.af, 0.25 * k.af] }) }]); },
  expect: (q) => { const k = jk(q); return { bound: [cor(k.af), k.Lc + 0.25 * k.af, cor(k.af)], mass: (hexV(k.af, k.Lc, k.rt) + hexV(k.af, 0.25 * k.af)) * rho('steel-low'), tol: 0.01, massTol: 0.03, says: 'its hex across by its depth and top; nominal mass, the hexes less its bore' }; },
  tests: [{ inputs: {}, outputs: { pieces: 2, offers: ['JIC -8 cap top/axis', 'JIC -8 cap/axis'] } }],
};
const JICPLUG: PartFamily<Jic> = {
  id: 'piece.jicplug', name: 'JIC plug (SAE J514)', gloss: 'A JIC 37° male plug by its dash size, -2 to -32', domains: ['mechanical', 'pipelines'], aisle: 'Hydraulics / JIC fittings',
  says: `A JIC 37° male plug ${JIC_SAYS}: its flare nose, its male thread (solid) and its hex stacked. Its thread offers its axis (\`JIC <dash> plug thread/axis\`), for a swivel nut over it`,
  rows: JIC, size: '-8', source: JIC_SRC,
  recipe: (q, size) => { const k = jk(q), n = `JIC ${size} plug`; return stack(n, 1, [{ b: steel(`${n} nose`, { cone: [k.rTip, k.rBase, k.hc] }) }, { b: steel(`${n} thread`, { cyl: [k.rt, k.Lm] }) }, { b: steel(`${n} hex`, { hex: [k.af, k.hh] }) }]); },
  expect: (q) => { const k = jk(q); return { bound: [cor(k.af), k.hc + k.Lm + k.hh, cor(k.af)], mass: (coneV(k.rTip, k.rBase, k.hc) + cylV(k.rt, k.Lm) + hexV(k.af, k.hh)) * rho('steel-low'), tol: 0.01, massTol: 0.03, says: 'its hex across by its nose, thread and hex; nominal mass, each solid' }; },
  tests: [{ inputs: {}, outputs: { pieces: 3 } }],
};
type Hose = (typeof R2AT)[string];
const HYDHOSE: PartFamily<Hose> = {
  id: 'piece.hydhose', name: 'Hydraulic hose (SAE 100R2AT)', gloss: 'A length of two-wire braided hydraulic hose, SAE 100R2AT, by its dash size, -4 to -32', domains: ['mechanical', 'pipelines'], aisle: 'Hydraulics / Hose',
  says: 'A straight length of SAE 100R2AT two-wire braided hydraulic hose (SAE J517) by its dash size (-4 to -32; its bore, outside and working pressure typical of makers\' tables): it goes over a hose tail and offers its axis (`<dash> R2AT hose/axis`) for a ferrule or a clamp over it. Approximated: its braids drawn in with its rubber, as one tube (weighed as rubber)',
  rows: R2AT, size: '-8', source: 'typical of SAE 100R2AT makers\' tables (src/nexus/parts/fluid.ts R2AT)',
  settings: [{ key: 'length', label: 'Length, mm', type: 'number', default: 500 }],
  cannot: (_q, _s, set) => (len(set) > 0 ? null : `a length above 0 (${String(set.length)} mm)`),
  recipe: (q, size, set) => made(`${size} R2AT hose`, 'nbr', { tube: [mm(q.id) / 2, mm(q.od) / 2, len(set)] }, { color: BLACK }),
  expect: (q, _s, set) => ({ bound: [mm(q.od), len(set), mm(q.od)], mass: annV(mm(q.id) / 2, mm(q.od) / 2, len(set)) * rho('nbr'), tol: 0.01, massTol: 0.02, says: 'its outside by its length; nominal mass, the tube as rubber' }),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['-8 R2AT hose/axis'] } }],
};
type Bond = (typeof BONDED)[string];
const bk = (q: Bond, size: string) => { const d = majorOf(size); return { ri: mm(d + q.ri) / 2, si: mm(d + q.si) / 2, so: mm(d + q.so) / 2, t: mm(q.t) }; };
const BONDEDSEAL: PartFamily<Bond> = {
  id: 'piece.bondedseal', name: 'Bonded seal', gloss: 'A bonded (Dowty) seal by its ISO 228-1 thread, G1/8 to G2: its steel ring round its rubber ring', domains: ['mechanical', 'pipelines'], aisle: 'Hydraulics / Seals',
  says: 'A bonded seal (a Dowty washer) by its ISO 228-1 thread (G1/8 to G2; its sizes typical of makers\' tables): its nitrile ring, its steel ring slid over it (Over a shaft). Its rubber offers its axis (`<thread> bonded seal rubber/axis`): it goes over a male end under its hex',
  rows: BONDED, size: 'G1/4', source: 'typical of bonded seal makers\' tables; ISO 228-1 threads (src/nexus/parts/fluid.ts BONDED)',
  recipe: (q, size) => { const k = bk(q, size), n = `${size} bonded seal`;
    return over(made(`${n} rubber`, 'nbr', { tube: [k.ri, k.si, k.t] }, { color: BLACK }), `${n} rubber/axis`, made(`${n} ring`, 'steel-low', { tube: [k.si, k.so, k.t] }, { color: ZINC }), 'mid', 'touch'); },
  expect: (q, size) => { const k = bk(q, size); return { bound: [2 * k.so, k.t, 2 * k.so], mass: annV(k.ri, k.si, k.t) * rho('nbr') + annV(k.si, k.so, k.t) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its outside and thickness; nominal mass, the two rings' }; },
  tests: [{ inputs: {}, outputs: { pieces: 2, offers: ['G1/4 bonded seal ring/axis', 'G1/4 bonded seal rubber/axis'] } }],
};

// ---- NPT fittings (ASME B1.20.1 threads, class 150 malleable iron) ------------------------------------------------------
type Npt = (typeof NPT)[string];
const nk = (q: Npt, size: string) => { const p = NPS[size.replace('-', ' ')]; if (!p || p.t['steel 40'] === undefined) throw new Error(`no NPS ${size} schedule 40 pipe (bdw.ts NPS)`);
  return { rt: inch(q.od) / 2, ro: inch(q.H) / 2, e: inch(q.B), a: inch(q.A), rb: mm(p.od / 2 - p.t['steel 40']), L2: inch(q.L2), W: inch(q.W), af: inch(q.af), hh: 0.45 * inch(q.af), top: Math.max(mm(3), 0.35 * inch(q.B)) }; };
const NPT_SRC = 'ASME B1.20.1 and ASME B16.3 class 150 as recalled, typical (src/nexus/parts/fluid.ts NPT); schedule 40 bores from bdw.ts NPS';
const NPT_SAYS = 'by its NPT size (1/8 to 2; its thread\'s outside, engagement and effective length after ASME B1.20.1, its body after ASME B16.3 class 150, as recalled: typical). Its threads and their taper not drawn: a female end\'s bore is the pipe\'s outside, a male end\'s outside it';
const IRON = 0x3a3a3c;
// (in order of size: a record keeps '1' and '2' ahead of the fractions)
const NPT_SIZES = ['1/8', '1/4', '3/8', '1/2', '3/4', '1', '1-1/4', '1-1/2', '2'];
const nptFamily = (id: string, name: string, gloss: string, says: string, rows: Record<string, Npt>, recipe: (q: Npt, size: string) => Block, expect: (q: Npt, size: string) => Expect, pieces: number, offers?: string[]): PartFamily<Npt> => ({
  id, name, gloss, domains: ['mechanical', 'pipelines', 'everyday'], aisle: 'Plumbing / NPT fittings', says: `${says} ${NPT_SAYS}`, rows, size: '1/2', source: NPT_SRC, recipe, expect,
  tests: [{ inputs: {}, outputs: { pieces, ...(offers ? { offers } : {}) } }] });
const NPTELBOW = nptFamily('piece.nptelbow', 'NPT elbow', 'A 90° female NPT elbow, malleable iron, 1/8 to 2', 'A 90° female elbow, laid as a run: its female end, its body bent through 90° and its other end. Each end offers its axis (`<size> NPT elbow end 1/axis`, `…end 2/axis`), for a pipe or a nipple along it.',
  NPT, (q, size) => { const k = nk(q, size); return elbowOf(`${size} NPT elbow`, 'cast-iron', IRON, { ri: k.rt, ro: k.ro }, k.e, { ri: k.rb, ro: k.ro }, k.a - k.e); },
  (q, size) => { const k = nk(q, size); return { bound: elbowBound(k.e, k.ro, k.a - k.e), mass: (2 * annV(k.rt, k.ro, k.e) + bendV(k.rb, k.ro, k.a - k.e, 90)) * rho('cast-iron'), tol: 0.01, massTol: 0.03, says: 'centre to end A each way and its band; nominal mass, its ends and bend' }; }, 3, ['1/2 NPT elbow end 1/axis', '1/2 NPT elbow end 2/axis']);
const NPTTEE = nptFamily('piece.npttee', 'NPT tee', 'A female NPT tee, malleable iron, 1/8 to 2', 'A female tee, laid as a run of its two ends and body, its branch joined into its side (Branch into a side). Each end offers its axis (`<size> NPT tee end 1/axis`, `…end 2/axis`, `…end 3/axis`).',
  NPT, (q, size) => { const k = nk(q, size); return teeOf(`${size} NPT tee`, 'cast-iron', IRON, { ri: k.rt, ro: k.ro }, k.e, { ri: k.rb, ro: k.ro }, 2 * (k.a - k.e), k.a - k.e); },
  (q, size) => { const k = nk(q, size); return { bound: teeBound(k.e, k.ro, 2 * (k.a - k.e), k.a - k.e), tol: 0.01, says: `centre to end A each way; ${TEE_SAYS}` }; }, 5);
const NPTCOUPLING = nptFamily('piece.nptcoupling', 'NPT coupling', 'A female NPT coupling, malleable iron, 1/8 to 2', 'A straight female coupling, threaded through: one tube of its band\'s outside and its length W. It offers its axis (`<size> NPT coupling/axis`), for a pipe from each end.',
  NPT, (q, size) => { const k = nk(q, size); return made(`${size} NPT coupling`, 'cast-iron', { tube: [k.rt, k.ro, k.W] }, { color: IRON }); },
  (q, size) => { const k = nk(q, size); return { bound: [2 * k.ro, k.W, 2 * k.ro], mass: annV(k.rt, k.ro, k.W) * rho('cast-iron'), tol: 0.01, massTol: 0.02, says: 'its band by its length W; nominal mass, the tube' }; }, 1, ['1/2 NPT coupling/axis']);
const NPTCAP = nptFamily('piece.nptcap', 'NPT cap', 'A female NPT cap, malleable iron, 1/8 to 2', 'A female cap: a cup of its band\'s outside, its bore the thread, as deep as its engagement B, its end closed. Its cavity (`<size> NPT cap/cavity`) takes a pipe\'s end.',
  NPT, (q, size) => { const k = nk(q, size); return made(`${size} NPT cap`, 'cast-iron', { cup: [k.ro, k.e + k.top, k.ro - k.rt, k.top] }, { color: IRON }); },
  (q, size) => { const k = nk(q, size); return { bound: [2 * k.ro, k.e + k.top, 2 * k.ro], mass: cupV(k.ro, k.e + k.top, k.ro - k.rt, k.top) * rho('cast-iron'), tol: 0.01, massTol: 0.02, says: 'its band by its depth and end; nominal mass, the cup' }; }, 1);
const NPTPLUG = nptFamily('piece.nptplug', 'NPT plug', 'A square head male NPT plug, steel, 1/8 to 2', 'A square head male plug: its thread (solid, its effective length L2) and its square head stacked. Its thread offers its axis (`<size> NPT plug thread/axis`), for a female end.',
  NPT, (q, size) => { const k = nk(q, size), n = `${size} NPT plug`; return stack(n, 1, [{ b: steel(`${n} thread`, { cyl: [k.rt, k.L2] }) }, { b: steel(`${n} head`, { box: [k.af, k.hh, k.af] }) }]); },
  (q, size) => { const k = nk(q, size), w = Math.max(2 * k.rt, k.af); return { bound: [w, k.L2 + k.hh, w], mass: (cylV(k.rt, k.L2) + k.af * k.af * k.hh) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its thread or head across by its length; nominal mass, the rod and the head' }; }, 2);
const NPTNIPPLE = nptFamily('piece.nptnipple', 'NPT hex nipple', 'A male NPT hex nipple, steel, 1/8 to 2', 'A hex nipple: its two male ends (each its effective thread L2, bored to schedule 40) and its hex between, stacked. Each end offers its axis (`<size> NPT nipple end 1/axis`, `…end 2/axis`), for a female end.',
  NPT, (q, size) => { const k = nk(q, size), n = `${size} NPT nipple`; return stack(n, 1, [{ b: steel(`${n} end 1`, { tube: [k.rb, k.rt, k.L2] }) }, { b: steel(`${n} hex`, { hex: [k.af, k.hh, k.rb] }) }, { b: steel(`${n} end 2`, { tube: [k.rb, k.rt, k.L2] }) }]); },
  (q, size) => { const k = nk(q, size); return { bound: [cor(k.af), 2 * k.L2 + k.hh, cor(k.af)], mass: (2 * annV(k.rb, k.rt, k.L2) + hexV(k.af, k.hh, k.rb)) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its hex across by its ends and hex; nominal mass, each solid' }; }, 3);
const NPTBUSHING = nptFamily('piece.nptbushing', 'NPT reducing bushing', 'A hex reducing bushing, male NPT to the next size down female, 1/4 to 2', 'A hex reducing bushing: its male end of this size, bored to the next size down\'s thread, and its hex, stacked. Its male end offers its axis (`<size> NPT bushing end/axis`), its bore the smaller pipe\'s.',
  Object.fromEntries(NPT_SIZES.slice(1).map((k) => [k, NPT[k]!])), (q, size) => { const k = nk(q, size), s = inch(NPT[NPT_SIZES[NPT_SIZES.indexOf(size) - 1]!]!.od) / 2, n = `${size} NPT bushing`; return stack(n, 1, [{ b: steel(`${n} end`, { tube: [s, k.rt, k.L2] }) }, { b: steel(`${n} hex`, { hex: [k.af, k.hh, s] }) }]); },
  (q, size) => { const k = nk(q, size), s = inch(NPT[NPT_SIZES[NPT_SIZES.indexOf(size) - 1]!]!.od) / 2; return { bound: [cor(k.af), k.L2 + k.hh, cor(k.af)], mass: (annV(s, k.rt, k.L2) + hexV(k.af, k.hh, s)) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its hex across by its end and hex; nominal mass, each solid' }; }, 2);

// ---- compression fittings (EN 1254-2 tube sizes) -------------------------------------------------------------------
type Comp = (typeof COMPRESSION)[string];
const ck = (q: Comp, size: string, bent = false) => { const d = mm(Number(size)); return { ri: d / 2 + mm(0.1), ro: mm(q.thread) / 2, Le: mm(q.nl + 2) + (bent ? Math.max(0, cor(mm(q.nut)) / 2 - mm(q.body) / 2) : 0), rw: d / 2 - mm(1), naf: mm(q.nut), nl: mm(q.nl), baf: mm(q.body), bh: 0.5 * mm(q.body), rob: mm(q.body) / 2, R: mm(q.R) }; };
const COMP_SRC = 'EN 1254-2 tube sizes; bodies and nuts typical of makers\' tables (src/nexus/parts/fluid.ts COMPRESSION)';
const COMP_SAYS = 'for copper tube by its outside (EN 1254-2 sizes 6 to 54 mm; its body and nuts typical): each end\'s bore the tube\'s outside and 0.1 mm, as deep as its nut and 2 mm (on an elbow or a tee, and as far again as its nut\'s corners stand past its body, so the nut clears the bend), its nut slid over it (Over a shaft). Approximated: its olives and threads not drawn';
const nutOf = (n: string, k: ReturnType<typeof ck>) => made(n, 'brass', { hex: [k.naf, k.nl, k.ro + GAP] }, { color: BRASS });
const nutted = (b: Block, n: string, k: ReturnType<typeof ck>, ends: number) => { let o = b; for (let i = 1; i <= ends; i++) o = over(o, `${n} end ${i}/axis`, nutOf(`${n} nut ${i}`, k), i === 1 ? 'lo' : 'hi', 'slide'); return o; };
const compFamily = (id: string, name: string, gloss: string, says: string, recipe: (q: Comp, size: string) => Block, expect: (q: Comp, size: string) => Expect, pieces: number): PartFamily<Comp> => ({
  id, name, gloss, domains: ['mechanical', 'pipelines', 'everyday'], aisle: 'Plumbing / Compression fittings', says: `${says} ${COMP_SAYS}`, rows: COMPRESSION, size: '15', source: COMP_SRC, recipe, expect, tests: [{ inputs: {}, outputs: { pieces } }] });
const COMPCOUPLING = compFamily('piece.compcoupling', 'Compression coupling', 'A straight brass compression coupling for copper tube, 6 to 54 mm', 'A straight compression coupling: its two ends and its body hex stacked, a nut over each end. Each end offers its axis (`<od> mm compression coupling end 1/axis`, `…end 2/axis`), for the tube along it,',
  (q, size) => { const k = ck(q, size), n = `${size} mm compression coupling`; return nutted(stack(n, 1, [{ b: made(`${n} end 1`, 'brass', { tube: [k.ri, k.ro, k.Le] }, { color: BRASS }) }, { b: made(`${n} body`, 'brass', { hex: [k.baf, k.bh, k.rw] }, { color: BRASS }) }, { b: made(`${n} end 2`, 'brass', { tube: [k.ri, k.ro, k.Le] }, { color: BRASS }) }]), n, k, 2); },
  (q, size) => { const k = ck(q, size), w = Math.max(cor(k.naf), cor(k.baf)); return { bound: [w, 2 * k.Le + k.bh, w], mass: (2 * annV(k.ri, k.ro, k.Le) + hexV(k.baf, k.bh, k.rw) + 2 * hexV(k.naf, k.nl, k.ro + GAP)) * rho('brass'), tol: 0.01, massTol: 0.03, says: 'its hexes across by its ends and body; nominal mass, ends, body and nuts' }; }, 5);
const COMPELBOW = compFamily('piece.compelbow', 'Compression elbow', 'A 90° brass compression elbow for copper tube, 6 to 54 mm', 'A 90° compression elbow, laid as a run: an end, its body bent through 90° (drawn round), an end, a nut over each end. Each end offers its axis (`<od> mm compression elbow end 1/axis`, `…end 2/axis`),',
  (q, size) => { const k = ck(q, size, true), n = `${size} mm compression elbow`; return nutted(elbowOf(n, 'brass', BRASS, { ri: k.ri, ro: k.ro }, k.Le, { ri: k.rw, ro: k.rob }, k.R), n, k, 2); },
  (q, size) => { const k = ck(q, size, true), c = Math.max(cor(k.naf) / 2, k.rob); return { bound: [c + k.R + k.Le, k.Le + k.R + c, 2 * c], mass: (2 * annV(k.ri, k.ro, k.Le) + bendV(k.rw, k.rob, k.R, 90) + 2 * hexV(k.naf, k.nl, k.ro + GAP)) * rho('brass'), tol: 0.01, massTol: 0.03, says: 'its reach each way and its nuts across; nominal mass, ends, bend and nuts' }; }, 5);
const COMPTEE = compFamily('piece.comptee', 'Compression tee', 'An equal brass compression tee for copper tube, 6 to 54 mm', 'An equal compression tee, laid as a run of two ends and its body, its branch joined into its side (Branch into a side), a nut over each of its three ends. Each end offers its axis (`<od> mm compression tee end 1/axis`, `…end 2/axis`, `…end 3/axis`),',
  (q, size) => { const k = ck(q, size, true), n = `${size} mm compression tee`; return nutted(teeOf(n, 'brass', BRASS, { ri: k.ri, ro: k.ro }, k.Le, { ri: k.rw, ro: k.rob }, 2 * k.rob + mm(2), k.rob + mm(1)), n, k, 3); },
  (q, size) => { const k = ck(q, size, true), c = Math.max(cor(k.naf) / 2, k.rob); return { bound: [c + k.rob + mm(1) + k.Le, 2 * k.Le + 2 * k.rob + mm(2), 2 * c], tol: 0.01, says: `its run and branch and its nuts across; ${TEE_SAYS}` }; }, 8);

// ---- PEX ----------------------------------------------------------------------------------------------------------
const PE = 0xf2f2ee;
const PEXPIPE: PartFamily<{ od: number; t: number }> = {
  id: 'piece.pexpipe', name: 'PEX tube (ASTM F876, CTS)', gloss: 'A length of PEX tube, copper tube size, SDR 9, 1/4 to 2', domains: ['mechanical', 'pipelines', 'everyday'], aisle: 'Plumbing / PEX',
  says: 'A straight length of PEX tube by its copper tube size (ASTM F876, 1/4 to 2: its outside the nominal and 1/8 in, its wall SDR 9 and at least 0.070 in, as recalled): it goes over an insert fitting\'s tail (Over a shaft), a crimp ring over it, and offers its axis (`<size> PEX tube/axis`). Weighed at polyethylene\'s density',
  rows: PEX_CTS, size: '1/2', source: 'ASTM F876 as recalled (src/nexus/parts/fluid.ts PEX_CTS)',
  settings: [{ key: 'length', label: 'Length, mm', type: 'number', default: 300 }],
  cannot: (_q, _s, set) => (len(set) > 0 ? null : `a length above 0 (${String(set.length)} mm)`),
  recipe: (q, size, set) => made(`${size} PEX tube`, 'pe', { tube: [inch(q.od / 2 - q.t), inch(q.od / 2), len(set)] }, { color: PEXRED }),
  expect: (q, _s, set) => ({ bound: [inch(q.od), len(set), inch(q.od)], mass: annV(inch(q.od / 2 - q.t), inch(q.od / 2), len(set)) * rho('pe'), tol: 0.01, massTol: 0.02, says: 'its outside by its length; nominal mass, the tube' }),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['1/2 PEX tube/axis'] } }],
};
const PEXMETRIC: PartFamily<[number, number]> = {
  id: 'piece.pexmetric', name: 'PEX tube (metric)', gloss: 'A length of metric PEX or PE-RT tube by its outside × wall, 12 × 2 to 63 × 5.8 mm', domains: ['mechanical', 'pipelines', 'everyday'], aisle: 'Plumbing / PEX',
  says: 'A straight length of metric PEX or PE-RT tube by its outside × wall (EN ISO 15875 sizes as sold, typical: 12 × 2 to 63 × 5.8 mm), for underfloor heating and water: it goes over a fitting\'s tail and offers its axis (`<od>x<wall> PEX tube/axis`). Weighed at polyethylene\'s density',
  rows: PEX_METRIC, size: '16x2', source: 'EN ISO 15875 sizes as sold, typical (src/nexus/parts/fluid.ts PEX_METRIC)',
  settings: [{ key: 'length', label: 'Length, mm', type: 'number', default: 300 }],
  cannot: (_q, _s, set) => (len(set) > 0 ? null : `a length above 0 (${String(set.length)} mm)`),
  recipe: ([od, t], size, set) => made(`${size} PEX tube`, 'pe', { tube: [mm(od / 2 - t), mm(od / 2), len(set)] }, { color: PE }),
  expect: ([od, t], _s, set) => ({ bound: [mm(od), len(set), mm(od)], mass: annV(mm(od / 2 - t), mm(od / 2), len(set)) * rho('pe'), tol: 0.01, massTol: 0.02, says: 'its outside by its length; nominal mass, the tube' }),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['16x2 PEX tube/axis'] } }],
};
const PEXRING: PartFamily<(typeof PEX_RING)[string]> = {
  id: 'piece.pexring', name: 'PEX crimp ring (ASTM F1807)', gloss: 'A copper crimp ring for PEX tube, 3/8 to 1', domains: ['mechanical', 'pipelines', 'everyday'], aisle: 'Plumbing / PEX',
  says: 'A copper crimp ring for PEX tube (ASTM F1807, 3/8 to 1; its sizes typical of makers\' tables), drawn before it is crimped: it slides over the tube on an insert\'s tail (Over a shaft) and offers its axis (`<size> PEX crimp ring/axis`)',
  rows: PEX_RING, size: '1/2', source: 'typical of ASTM F1807 crimp ring makers\' tables (src/nexus/parts/fluid.ts PEX_RING)',
  recipe: (q, size) => made(`${size} PEX crimp ring`, 'copper', { tube: [inch(q.id) / 2, inch(q.od) / 2, inch(q.w)] }, { color: COPPER }),
  expect: (q) => ({ bound: [inch(q.od), inch(q.w), inch(q.od)], mass: annV(inch(q.id) / 2, inch(q.od) / 2, inch(q.w)) * rho('copper'), tol: 0.01, massTol: 0.02, says: 'its outside by its width; nominal mass, the ring' }),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['1/2 PEX crimp ring/axis'] } }],
};
type Ins = (typeof PEX_INSERT)[string];
const ik = (q: Ins) => ({ rT: inch(q.tail) / 2, rb: inch(q.bore) / 2, L: inch(q.L), rs: inch(q.shoulder) / 2, hs: mm(3) });
/** a barbed tail's turned profile, its mouth at its top (three ridges at the tube's bore, their roots 0.92 of it), or at its
 *  foot (flipped) */
const tailPts = (rT: number, rb: number, L: number, mouthUp = true): [number, number][] => { const rr = 0.92 * rT, p = (L - mm(2)) / 3;
  const pts: [number, number][] = [[rb, 0], [rT, 0], [rr, p], [rT, p], [rr, 2 * p], [rT, 2 * p], [rr, 3 * p], [rr, L], [rb, L]];
  return mouthUp ? pts : pts.map(([r, h]) => [r, L - h] as [number, number]).reverse(); };
const PEX_SRC = 'typical of ASTM F1807 insert fitting makers\' tables (src/nexus/parts/fluid.ts PEX_INSERT)';
const pexFamily = (id: string, name: string, gloss: string, says: string, recipe: (q: Ins, size: string) => Block, expect: (q: Ins, size: string) => Expect, pieces: number): PartFamily<Ins> => ({
  id, name, gloss, domains: ['mechanical', 'pipelines', 'everyday'], aisle: 'Plumbing / PEX', says, rows: PEX_INSERT, size: '1/2', source: PEX_SRC, recipe, expect, tests: [{ inputs: {}, outputs: { pieces } }] });
const PEXCOUPLING = pexFamily('piece.pexcoupling', 'PEX insert coupling', 'A brass PEX insert coupling (ASTM F1807), 3/8 to 1', 'A brass insert coupling for PEX tube (ASTM F1807, 3/8 to 1; typical): its two barbed tails (three ridges each, turned) and its shoulder between, stacked. Each tail offers its axis (`<size> PEX coupling tail 1/axis`, `…tail 2/axis`): the tube goes over it (Over a shaft) and a crimp ring over the tube',
  (q, size) => { const k = ik(q), n = `${size} PEX coupling`; return stack(n, 1, [{ b: made(`${n} tail 1`, 'brass', { lathe: { pts: tailPts(k.rT, k.rb, k.L, false) } }, { color: BRASS }) }, { b: made(`${n} shoulder`, 'brass', { tube: [k.rb, k.rs, k.hs] }, { color: BRASS }) }, { b: made(`${n} tail 2`, 'brass', { lathe: { pts: tailPts(k.rT, k.rb, k.L) } }, { color: BRASS }) }]); },
  (q) => { const k = ik(q), w = 2 * Math.max(k.rs, k.rT); return { bound: [w, 2 * k.L + k.hs, w], mass: (2 * latheV(tailPts(k.rT, k.rb, k.L)) + annV(k.rb, k.rs, k.hs)) * rho('brass'), tol: 0.01, massTol: 0.03, says: 'its shoulder across by its tails; nominal mass, the tails turned (Pappus) and the shoulder' }; }, 3);
const PEXELBOW = pexFamily('piece.pexelbow', 'PEX insert elbow', 'A 90° brass PEX insert elbow (ASTM F1807), 3/8 to 1', 'A 90° brass insert elbow for PEX tube (ASTM F1807, 3/8 to 1; typical), laid as a run: a tail, its body bent through 90°, a tail. Each tail offers its axis (`<size> PEX elbow end 1/axis`, `…end 2/axis`) for the tube over it. Approximated: its ridges not drawn on an elbow (plain tails)',
  (q, size) => { const k = ik(q); return elbowOf(`${size} PEX elbow`, 'brass', BRASS, { ri: k.rb, ro: k.rT }, k.L, { ri: k.rb, ro: k.rs }, k.rs + mm(1)); },
  (q) => { const k = ik(q); return { bound: elbowBound(k.L, k.rs, k.rs + mm(1)), mass: (2 * annV(k.rb, k.rT, k.L) + bendV(k.rb, k.rs, k.rs + mm(1), 90)) * rho('brass'), tol: 0.01, massTol: 0.03, says: 'its reach each way and its body across; nominal mass, its tails and bend' }; }, 3);
const PEXTEE = pexFamily('piece.pextee', 'PEX insert tee', 'An equal brass PEX insert tee (ASTM F1807), 3/8 to 1', 'An equal brass insert tee for PEX tube (ASTM F1807, 3/8 to 1; typical), laid as a run of two tails and its body, its branch joined into its side (Branch into a side). Each tail offers its axis (`<size> PEX tee end 1/axis`, `…end 2/axis`, `…end 3/axis`). Approximated: its ridges not drawn on a tee (plain tails)',
  (q, size) => { const k = ik(q); return teeOf(`${size} PEX tee`, 'brass', BRASS, { ri: k.rb, ro: k.rT }, k.L, { ri: k.rb, ro: k.rs }, 2 * k.rs + mm(2), k.rs + mm(1)); },
  (q) => { const k = ik(q); return { bound: teeBound(k.L, k.rs, 2 * k.rs + mm(2), k.rs + mm(1)), tol: 0.01, says: `its run and branch; ${TEE_SAYS}` }; }, 5);

// ---- garden hose connectors (GHT 3/4-11.5 NH) -------------------------------------------------------------------------
type Gard = (typeof GARDEN)[string];
const hk = (q: Gard) => ({ rT: mm(q.tail) / 2, rb: mm(q.bore) / 2, L: mm(q.L), rt: inch(GHT_MAJOR) / 2, rn: mm(16.5), hn: mm(14), lip: mm(3), af: mm(30), hh: mm(6), tl: mm(14) });
const GHT_SAYS = 'by the bore of the hose it takes (1/2, 5/8 or 3/4 in; its tail typical), its thread GHT 3/4-11.5 NH (not drawn); its barbed tail (three ridges, turned) for the hose over it (`<bore> hose';
const HOSEFEMALE: PartFamily<Gard> = {
  id: 'piece.hosefemale', name: 'Garden hose female coupling (GHT)', gloss: 'A brass female swivel garden hose coupling (GHT 3/4-11.5 NH) by the hose\'s bore', domains: ['mechanical', 'pipelines', 'everyday'], aisle: 'Plumbing / Garden hose',
  says: `A brass female swivel garden hose coupling ${GHT_SAYS} female tail/axis\`), its lip and its swivel nut stacked; the nut's bore the thread's major, for a tap's or a male coupling's thread into it (\`<bore> hose female nut/axis\`). Approximated: its washer and knurl not drawn`,
  rows: GARDEN, size: '5/8', source: 'GHT major as recalled; typical of hose connector makers\' tables (src/nexus/parts/fluid.ts GARDEN)',
  recipe: (q, size) => { const k = hk(q), n = `${size} hose female`; return stack(n, 1, [{ b: made(`${n} tail`, 'brass', { lathe: { pts: tailPts(k.rT, k.rb, k.L, false) } }, { color: BRASS }) }, { b: made(`${n} lip`, 'brass', { tube: [k.rb, k.rn, k.lip] }, { color: BRASS }) }, { b: made(`${n} nut`, 'brass', { tube: [k.rt, k.rn, k.hn] }, { color: BRASS }) }]); },
  expect: (q) => { const k = hk(q), w = 2 * Math.max(k.rn, k.rT); return { bound: [w, k.L + k.lip + k.hn, w], mass: (latheV(tailPts(k.rT, k.rb, k.L)) + annV(k.rb, k.rn, k.lip) + annV(k.rt, k.rn, k.hn)) * rho('brass'), tol: 0.01, massTol: 0.03, says: 'its nut across by its tail, lip and nut; nominal mass, each turned or tube solid' }; },
  tests: [{ inputs: {}, outputs: { pieces: 3 } }],
};
const HOSEMALE: PartFamily<Gard> = {
  id: 'piece.hosemale', name: 'Garden hose male coupling (GHT)', gloss: 'A brass male garden hose coupling (GHT 3/4-11.5 NH) by the hose\'s bore', domains: ['mechanical', 'pipelines', 'everyday'], aisle: 'Plumbing / Garden hose',
  says: `A brass male garden hose coupling ${GHT_SAYS} male tail/axis\`), its hex and its male thread stacked; the thread offers its axis (\`<bore> hose male thread/axis\`), for a female coupling's nut over it`,
  rows: GARDEN, size: '5/8', source: 'GHT major as recalled; typical of hose connector makers\' tables (src/nexus/parts/fluid.ts GARDEN)',
  recipe: (q, size) => { const k = hk(q), n = `${size} hose male`; return stack(n, 1, [{ b: made(`${n} tail`, 'brass', { lathe: { pts: tailPts(k.rT, k.rb, k.L, false) } }, { color: BRASS }) }, { b: made(`${n} hex`, 'brass', { hex: [k.af, k.hh, k.rb] }, { color: BRASS }) }, { b: made(`${n} thread`, 'brass', { tube: [k.rb, k.rt, k.tl] }, { color: BRASS }) }]); },
  expect: (q) => { const k = hk(q), w = Math.max(cor(k.af), 2 * k.rT); return { bound: [w, k.L + k.hh + k.tl, w], mass: (latheV(tailPts(k.rT, k.rb, k.L)) + hexV(k.af, k.hh, k.rb) + annV(k.rb, k.rt, k.tl)) * rho('brass'), tol: 0.01, massTol: 0.03, says: 'its hex across by its tail, hex and thread; nominal mass, each solid' }; },
  tests: [{ inputs: {}, outputs: { pieces: 3 } }],
};

// ---- more of the same trades: 45° elbows, crosses, unions, stop ends, one-wire hose, gate valves -------------------------
const NPTELBOW45 = nptFamily('piece.nptelbow45', 'NPT 45° elbow', 'A 45° female NPT elbow, malleable iron, 1/8 to 2', 'A 45° female elbow, laid as a run: its female end, its body bent through 45° (its radius from its centre to end C) and its other end. Each end offers its axis (`<size> NPT 45 elbow end 1/axis`, `…end 2/axis`).',
  NPT, (q, size) => { const k = nk(q, size); return elbowOf(`${size} NPT 45 elbow`, 'cast-iron', IRON, { ri: k.rt, ro: k.ro }, k.e, { ri: k.rb, ro: k.ro }, (inch(q.C) - k.e) / Math.tan(Math.PI / 8), 45); },
  (q, size) => { const k = nk(q, size); return { mass: (2 * annV(k.rt, k.ro, k.e) + bendV(k.rb, k.ro, (inch(q.C) - k.e) / Math.tan(Math.PI / 8), 45)) * rho('cast-iron'), tol: 0.01, massTol: 0.03, says: 'nominal mass, its ends and its bend (its centre to end C)' }; }, 3);
const NPTCROSS = nptFamily('piece.nptcross', 'NPT cross', 'A female NPT cross, malleable iron, 1/8 to 2', 'A female cross, laid as a run of its two ends and body, a branch joined into each side (Branch into a side). Each end offers its axis (`<size> NPT cross end 1/axis` to `…end 4/axis`).',
  NPT, (q, size) => { const k = nk(q, size), n = `${size} NPT cross`, end = { ri: k.rt, ro: k.ro }, body = { ri: k.rb, ro: k.ro };
    return branch(teeOf(n, 'cast-iron', IRON, end, k.e, body, 2 * (k.a - k.e), k.a - k.e), `${n} body/axis`, run(`${n} branch 2`, [seg(`${n} branch 2 body`, 'cast-iron', IRON, body, k.a - k.e), seg(`${n} end 4`, 'cast-iron', IRON, end, k.e)]), 180); },
  (q, size) => { const k = nk(q, size); return { bound: [2 * k.a, 2 * k.a, 2 * k.ro], tol: 0.01, says: `centre to end A each way; ${TEE_SAYS}` }; }, 7);
const NPTUNION = nptFamily('piece.nptunion', 'NPT union', 'A female NPT union, malleable iron, 1/8 to 2', 'A female union: its two female ends and its nut between, stacked (its ground joint inside not drawn). Each end offers its axis (`<size> NPT union end 1/axis`, `…end 2/axis`).',
  NPT, (q, size) => { const k = nk(q, size), n = `${size} NPT union`; return stack(n, 1, [{ b: made(`${n} end 1`, 'cast-iron', { tube: [k.rt, k.ro, k.e] }, { color: IRON }) }, { b: made(`${n} nut`, 'cast-iron', { hex: [2.5 * k.ro, 0.6 * k.W, k.rb] }, { color: IRON }) }, { b: made(`${n} end 2`, 'cast-iron', { tube: [k.rt, k.ro, k.e] }, { color: IRON }) }]); },
  (q, size) => { const k = nk(q, size); return { bound: [cor(2.5 * k.ro), 2 * k.e + 0.6 * k.W, cor(2.5 * k.ro)], mass: (2 * annV(k.rt, k.ro, k.e) + hexV(2.5 * k.ro, 0.6 * k.W, k.rb)) * rho('cast-iron'), tol: 0.01, massTol: 0.02, says: 'its nut across by its ends and nut; nominal mass, each solid' }; }, 3);
const JICELBOW45: PartFamily<Jic> = {
  id: 'piece.jicelbow45', name: 'JIC 45° elbow (SAE J514)', gloss: 'A JIC 37° 45° male elbow by its dash size, -2 to -32', domains: ['mechanical', 'pipelines'], aisle: 'Hydraulics / JIC fittings',
  says: `A JIC 37° 45° male elbow ${JIC_SAYS}, laid as a run: its male end, its body bent through 45° (drawn round), its other end; its noses not drawn on an elbow. Each end offers its axis (\`JIC <dash> 45 elbow end 1/axis\`, \`…end 2/axis\`)`,
  rows: JIC, size: '-8', source: JIC_SRC,
  recipe: (q, size) => { const k = jk(q); return elbowOf(`JIC ${size} 45 elbow`, 'steel-low', STEEL, { ri: k.rb, ro: k.rt }, k.Lm, { ri: k.rb, ro: k.ro }, k.R, 45); },
  expect: (q) => { const k = jk(q); return { mass: (2 * annV(k.rb, k.rt, k.Lm) + bendV(k.rb, k.ro, k.R, 45)) * rho('steel-low'), tol: 0.01, massTol: 0.03, says: 'nominal mass, its ends and its bend' }; },
  tests: [{ inputs: {}, outputs: { pieces: 3 } }],
};
const COMPSTOPEND = compFamily('piece.compstopend', 'Compression stop end', 'A brass compression stop end for copper tube, 6 to 54 mm', 'A compression stop end: its end and its closed body hex stacked, its nut over its end. Its end offers its axis (`<od> mm compression stop end end 1/axis`),',
  (q, size) => { const k = ck(q, size), n = `${size} mm compression stop end`; return nutted(stack(n, 1, [{ b: made(`${n} end 1`, 'brass', { tube: [k.ri, k.ro, k.Le] }, { color: BRASS }) }, { b: made(`${n} body`, 'brass', { hex: [k.baf, k.bh] }, { color: BRASS }) }]), n, k, 1); },
  (q, size) => { const k = ck(q, size), w = Math.max(cor(k.naf), cor(k.baf)); return { bound: [w, k.Le + k.bh, w], mass: (annV(k.ri, k.ro, k.Le) + hexV(k.baf, k.bh) + hexV(k.naf, k.nl, k.ro + GAP)) * rho('brass'), tol: 0.01, massTol: 0.03, says: 'its hexes across by its end and body; nominal mass, end, body and nut' }; }, 3);
/** SAE 100R1AT (SAE J517) one-wire braided hydraulic hose by dash size, typical of makers' tables: its bore and outside,
 *  mm, and its working pressure, bar. */
export const R1AT: Record<string, { id: number; od: number; bar: number }> = {
  '-4': { id: 6.4, od: 13.4, bar: 207 }, '-5': { id: 7.9, od: 15, bar: 190 }, '-6': { id: 9.5, od: 17.4, bar: 180 }, '-8': { id: 12.7, od: 20.6, bar: 160 }, '-10': { id: 15.9, od: 23.7, bar: 130 },
  '-12': { id: 19, od: 27.7, bar: 105 }, '-16': { id: 25.4, od: 35.6, bar: 88 }, '-20': { id: 31.8, od: 43.5, bar: 63 }, '-24': { id: 38.1, od: 50.6, bar: 50 }, '-32': { id: 50.8, od: 64, bar: 40 },
};
const HYDHOSER1: PartFamily<Hose> = { ...HYDHOSE, id: 'piece.hydhoser1', name: 'Hydraulic hose (SAE 100R1AT)', gloss: 'A length of one-wire braided hydraulic hose, SAE 100R1AT, by its dash size, -4 to -32',
  says: 'A straight length of SAE 100R1AT one-wire braided hydraulic hose (SAE J517) by its dash size (-4 to -32; its bore, outside and working pressure typical of makers\' tables): it goes over a hose tail and offers its axis (`<dash> R1AT hose/axis`). Approximated: its braid drawn in with its rubber, as one tube (weighed as rubber)',
  rows: R1AT, source: 'typical of SAE 100R1AT makers\' tables (src/nexus/parts/fluid.ts R1AT)',
  recipe: (q, size, set) => made(`${size} R1AT hose`, 'nbr', { tube: [mm(q.id) / 2, mm(q.od) / 2, len(set)] }, { color: BLACK }),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['-8 R1AT hose/axis'] } }] };
/** Flanged gate valves by DN: EN 558 basic series 14 face to face and EN 1092-1 PN16 flanges (outside, bolt circle, hole
 *  and count) as recalled, their thickness typical, mm. To DN150: a larger gate is wider than its chest is long here. */
export const GATE: Record<string, { ftf: number; D: number; b: number; k: number; d2: number; n: number }> = {
  DN40: { ftf: 140, D: 150, b: 18, k: 110, d2: 18, n: 4 }, DN50: { ftf: 150, D: 165, b: 19, k: 125, d2: 18, n: 4 }, DN65: { ftf: 170, D: 185, b: 19, k: 145, d2: 18, n: 8 },
  DN80: { ftf: 180, D: 200, b: 19, k: 160, d2: 18, n: 8 }, DN100: { ftf: 190, D: 220, b: 19, k: 180, d2: 18, n: 8 }, DN125: { ftf: 200, D: 250, b: 19, k: 210, d2: 18, n: 8 },
  DN150: { ftf: 210, D: 285, b: 19, k: 240, d2: 22, n: 8 },
};
type Gv = (typeof GATE)[string];
/** a gate valve's sizes, m: its bore, its chest's outside (round about its gate's corners), the gate's thickness, its bonnet
 *  round the gate's sweep, the bonnet's height (the gate rises into it), the stem (typical) */
const gvOf = (q: Gv, size: string) => { const DN = Number(size.slice(2)), dn = mm(DN), tg = 0.15 * dn; return { dn, rc: 0.72 * dn + mm(6), tg, rbn: Math.hypot(tg / 2, dn / 2) + mm(5), hb: 1.1 * dn + mm(10), rs: mm(0.08 * DN + 4) / 2, L: mm(q.ftf), b: mm(q.b), D: mm(q.D) }; };
const GATEVALVE: PartFamily<Gv> = {
  id: 'piece.gatevalve', name: 'Gate valve (EN 558 series 14)', gloss: 'A flanged gate valve by its DN, DN40 to DN150, PN16: its gate slides up on its stem', domains: ['mechanical', 'pipelines'],
  aisle: 'Plumbing / Valves',
  says: 'A flanged gate valve by its DN (DN40 to DN150; its face to face EN 558 series 14, its flanges EN 1092-1 PN16, as recalled; its chest, bonnet and stem typical): its two flanges and its chest laid along the flow (x), its bonnet onto its top, its gate and rising stem on one slide joint passed down the bonnet into the bore (Through a line), drawn shut. It moves: the gate slides up out of the bore by its DN, into its bonnet, its stem rising to the bonnet\'s top. It offers each flange\'s bolt holes (`<DN> gate valve flange 1/holes`, `…flange 2/holes`, for a bolted joint to a pipe\'s flange), the bore\'s axis (`…chest/axis`) and the stem\'s (`…stem/axis`, for a handwheel). Approximated: its chest round, its wedge a flat plate, its handwheel, packing and seats not drawn; its mass not held (the drawing weighs the gate\'s cut in the chest whole, as Branch\'s, a fault left open)',
  rows: GATE, size: 'DN50', source: 'EN 558 series 14 and EN 1092-1 PN16 as recalled, typical (src/nexus/parts/fluid.ts GATE)',
  recipe: (q, size) => { const k = gvOf(q, size), n = `${size} gate valve`, flange = (i: number) => turn(made(`${n} flange ${i}`, 'cast-iron', { tube: [k.dn / 2, k.D / 2, k.b] }, { color: 0x2c4a7a, pattern: { name: 'holes', circle: { n: q.n, r: mm(q.k) / 2 }, hole: mm(q.d2) / 2 } }), 2, 90);
    const body = stack(n, 0, [{ b: flange(1) }, { b: turn(made(`${n} chest`, 'cast-iron', { tube: [k.dn / 2, k.rc, k.L - 2 * k.b] }, { color: 0x2c4a7a }), 2, 90) }, { b: flange(2) }]);
    const valve = onto(body, '+y', made(`${n} bonnet`, 'cast-iron', { cyl: [k.rbn, k.hb] }, { color: 0x2c4a7a })), j = joint(`${n} stem`, { slide: room(k.dn) });
    const gate = stack(`${n} gate and stem`, 1, [{ b: made(`${n} gate`, 'cast-iron', { box: [k.tg, k.dn, k.dn] }, { joint: j, color: 0x55595e }) }, { b: made(`${n} stem`, 'stainless-304', { cyl: [k.rs, k.rc + k.hb - 1.5 * k.dn] }, { joint: j, color: 0xd8dade }) }]);
    return through(valve, gate, { port: `${n} bonnet/axis`, from: 'hi' }, 'slide'); },
  expect: (q, size) => { const k = gvOf(q, size); return { bound: [k.L, k.D / 2 + Math.max(k.D / 2, k.rc + k.hb), k.D], tol: 0.01, says: 'its face to face, its flanges across, and its height to its bonnet\'s top (the stem, risen by its DN, reaches it)' }; },
  tests: [{ inputs: {}, outputs: { pieces: 6 } }],
};

// ---- ORFS (SAE J1453) and O-ring boss (SAE J1926) ---------------------------------------------------------------------
/** O-ring face seal fittings (SAE J1453) by dash size: the thread's major (in) and threads an inch, the tube's outside
 *  (in), as recalled; the hex (in) typical. */
export const ORFS: Record<string, { major: number; tpi: number; tube: number; hex: number }> = {
  '-4': { major: 0.5625, tpi: 18, tube: 0.25, hex: 0.6875 }, '-6': { major: 0.6875, tpi: 16, tube: 0.375, hex: 0.8125 }, '-8': { major: 0.8125, tpi: 16, tube: 0.5, hex: 0.9375 },
  '-10': { major: 1, tpi: 14, tube: 0.625, hex: 1.125 }, '-12': { major: 1.1875, tpi: 12, tube: 0.75, hex: 1.375 }, '-16': { major: 1.4375, tpi: 12, tube: 1, hex: 1.625 },
  '-20': { major: 1.6875, tpi: 12, tube: 1.25, hex: 1.875 }, '-24': { major: 2, tpi: 12, tube: 1.5, hex: 2.25 },
};
type Orfs = (typeof ORFS)[string];
const ok = (q: Orfs) => { const rt = inch(q.major) / 2, af = inch(q.hex); return { rt, rb: 0.35 * inch(q.tube), Lm: 0.8 * inch(q.major) + mm(3), af, hh: 0.45 * af, ro: af / 2, R: af / 2 + mm(1) }; };
const ORFS_SRC = 'SAE J1453 threads and tube sizes as recalled, hexes and lengths typical (src/nexus/parts/fluid.ts ORFS)';
const ORFS_SAYS = 'by its dash size (-4 to -24; its thread and tube the standard\'s as recalled, its hex and lengths typical); each male end flat-faced (its O-ring groove and the threads not drawn)';
const ORFSUNION: PartFamily<Orfs> = {
  id: 'piece.orfsunion', name: 'ORFS union (SAE J1453)', gloss: 'An O-ring face seal male union by its dash size, -4 to -24', domains: ['mechanical', 'pipelines'], aisle: 'Hydraulics / ORFS fittings',
  says: `An O-ring face seal straight male union ${ORFS_SAYS}: its end, hex and other end stacked. Each end offers its axis (\`ORFS <dash> union end 1/axis\`, \`…end 2/axis\`), for a swivel nut over it`,
  rows: ORFS, size: '-8', source: ORFS_SRC,
  recipe: (q, size) => { const k = ok(q), n = `ORFS ${size} union`; return stack(n, 1, [{ b: steel(`${n} end 1`, { tube: [k.rb, k.rt, k.Lm] }) }, { b: steel(`${n} hex`, { hex: [k.af, k.hh, k.rb] }) }, { b: steel(`${n} end 2`, { tube: [k.rb, k.rt, k.Lm] }) }]); },
  expect: (q) => { const k = ok(q); return { bound: [cor(k.af), 2 * k.Lm + k.hh, cor(k.af)], mass: (2 * annV(k.rb, k.rt, k.Lm) + hexV(k.af, k.hh, k.rb)) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its hex across by its ends and hex; nominal mass, each solid' }; },
  tests: [{ inputs: {}, outputs: { pieces: 3 } }],
};
const ORFSELBOW: PartFamily<Orfs> = {
  id: 'piece.orfselbow', name: 'ORFS elbow (SAE J1453)', gloss: 'An O-ring face seal 90° male elbow by its dash size, -4 to -24', domains: ['mechanical', 'pipelines'], aisle: 'Hydraulics / ORFS fittings',
  says: `An O-ring face seal 90° male elbow ${ORFS_SAYS}, laid as a run: its end, its body bent through 90° (drawn round), its other end. Each end offers its axis (\`ORFS <dash> elbow end 1/axis\`, \`…end 2/axis\`)`,
  rows: ORFS, size: '-8', source: ORFS_SRC,
  recipe: (q, size) => { const k = ok(q); return elbowOf(`ORFS ${size} elbow`, 'steel-low', STEEL, { ri: k.rb, ro: k.rt }, k.Lm, { ri: k.rb, ro: k.ro }, k.R); },
  expect: (q) => { const k = ok(q); return { bound: elbowBound(k.Lm, k.ro, k.R), mass: (2 * annV(k.rb, k.rt, k.Lm) + bendV(k.rb, k.ro, k.R, 90)) * rho('steel-low'), tol: 0.01, massTol: 0.03, says: 'its reach each way and its body across; nominal mass, its ends and bend' }; },
  tests: [{ inputs: {}, outputs: { pieces: 3 } }],
};
const ORFSTEE: PartFamily<Orfs> = {
  id: 'piece.orfstee', name: 'ORFS tee (SAE J1453)', gloss: 'An O-ring face seal male tee by its dash size, -4 to -24', domains: ['mechanical', 'pipelines'], aisle: 'Hydraulics / ORFS fittings',
  says: `An O-ring face seal male tee ${ORFS_SAYS}, laid as a run of its two ends and body, its branch joined into its side (Branch into a side). Each end offers its axis (\`ORFS <dash> tee end 1/axis\` to \`…end 3/axis\`)`,
  rows: ORFS, size: '-8', source: ORFS_SRC,
  recipe: (q, size) => { const k = ok(q); return teeOf(`ORFS ${size} tee`, 'steel-low', STEEL, { ri: k.rb, ro: k.rt }, k.Lm, { ri: k.rb, ro: k.ro }, 2 * k.ro + mm(2), k.ro + mm(1)); },
  expect: (q) => { const k = ok(q); return { bound: teeBound(k.Lm, k.ro, 2 * k.ro + mm(2), k.ro + mm(1)), tol: 0.01, says: `its run and branch; ${TEE_SAYS}` }; },
  tests: [{ inputs: {}, outputs: { pieces: 5 } }],
};
const ORB_SAYS = 'by its dash size (-2 to -32; its straight thread SAE J1926\'s, the same as JIC\'s, as recalled; its hex and lengths typical; its O-ring and the threads not drawn)';
const ORBPLUG: PartFamily<Jic> = {
  id: 'piece.orbplug', name: 'O-ring boss plug (SAE J1926)', gloss: 'A hex O-ring boss plug by its dash size, -2 to -32', domains: ['mechanical', 'pipelines'], aisle: 'Hydraulics / O-ring boss',
  says: `A hex O-ring boss plug ${ORB_SAYS}: its thread (solid) and its hex stacked. Its thread offers its axis (\`ORB <dash> plug thread/axis\`), for a port`,
  rows: JIC, size: '-8', source: 'SAE J1926 threads as recalled (the JIC table), hexes typical (src/nexus/parts/fluid.ts JIC)',
  recipe: (q, size) => { const k = jk(q), n = `ORB ${size} plug`; return stack(n, 1, [{ b: steel(`${n} thread`, { cyl: [k.rt, 0.8 * k.Lm] }) }, { b: steel(`${n} hex`, { hex: [k.af, k.hh] }) }]); },
  expect: (q) => { const k = jk(q); return { bound: [cor(k.af), 0.8 * k.Lm + k.hh, cor(k.af)], mass: (cylV(k.rt, 0.8 * k.Lm) + hexV(k.af, k.hh)) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its hex across by its thread and hex; nominal mass, each solid' }; },
  tests: [{ inputs: {}, outputs: { pieces: 2 } }],
};
const ORBJIC: PartFamily<Jic> = {
  id: 'piece.orbjic', name: 'ORB to JIC adaptor', gloss: 'A straight adaptor, O-ring boss (SAE J1926) to JIC 37° male (SAE J514), by its dash size, -2 to -32', domains: ['mechanical', 'pipelines'], aisle: 'Hydraulics / O-ring boss',
  says: `A straight adaptor from an O-ring boss port to a JIC 37° male end ${ORB_SAYS}: its boss thread, its hex, its JIC end and its flare nose stacked. Its boss thread offers its axis (\`ORB-JIC <dash> adaptor boss/axis\`, for a port), its JIC end its own (\`…jic/axis\`, for a swivel nut)`,
  rows: JIC, size: '-8', source: 'SAE J1926 and SAE J514 threads as recalled (the JIC table), hexes typical (src/nexus/parts/fluid.ts JIC)',
  recipe: (q, size) => { const k = jk(q), n = `ORB-JIC ${size} adaptor`;
    return stack(n, 1, [{ b: steel(`${n} boss`, { tube: [k.rb, k.rt, 0.8 * k.Lm] }) }, { b: steel(`${n} hex`, { hex: [k.af, k.hh, k.rb] }) }, { b: steel(`${n} jic`, { tube: [k.rb, k.rt, k.Lm] }) }, { b: steel(`${n} nose`, { cone: [k.rBase, k.rTip, k.hc, k.rb] }) }]); },
  expect: (q) => { const k = jk(q); return { bound: [cor(k.af), 1.8 * k.Lm + k.hh + k.hc, cor(k.af)], mass: (annV(k.rb, k.rt, 1.8 * k.Lm) + hexV(k.af, k.hh, k.rb) + coneV(k.rBase, k.rTip, k.hc, k.rb)) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its hex across by its ends, hex and nose; nominal mass, each solid' }; },
  tests: [{ inputs: {}, outputs: { pieces: 4 } }],
};

// ---- PP-R and PE pressure pipe ----------------------------------------------------------------------------------------
/** PP-R pipe (DIN 8077) by its outside and pressure class: its wall, mm (PN10 SDR 11, PN16 SDR 7.4, PN20 SDR 6, as
 *  recalled). */
export const PPR: Record<string, [number, number]> = Object.fromEntries(([[20, 1.9, 2.8, 3.4], [25, 2.3, 3.5, 4.2], [32, 2.9, 4.4, 5.4], [40, 3.7, 5.5, 6.7], [50, 4.6, 6.9, 8.3], [63, 5.8, 8.6, 10.5], [75, 6.8, 10.3, 12.5], [90, 8.2, 12.3, 15], [110, 10, 15.1, 18.3]] as const)
  .flatMap(([od, a, b, c]) => [[`${od} PN10`, [od, a]], [`${od} PN16`, [od, b]], [`${od} PN20`, [od, c]]]));
/** PE100 pressure pipe (EN 12201-2) by its outside and SDR: its wall, mm (as recalled). */
export const PE100: Record<string, [number, number]> = Object.fromEntries([...([[20, 2], [25, 2.3], [32, 3], [40, 3.7], [50, 4.6], [63, 5.8], [75, 6.8], [90, 8.2], [110, 10], [125, 11.4], [160, 14.6]] as const).map(([od, t]) => [`${od} SDR11`, [od, t]]),
  ...([[32, 2], [40, 2.4], [50, 3], [63, 3.8], [75, 4.5], [90, 5.4], [110, 6.6], [125, 7.4], [160, 9.5]] as const).map(([od, t]) => [`${od} SDR17`, [od, t]])]);
const pressurePipe = (id: string, name: string, gloss: string, says: string, rows: Record<string, [number, number]>, size: string, source: string, mat: string, color: number): PartFamily<[number, number]> => ({
  id, name, gloss, domains: ['mechanical', 'pipelines', 'everyday'], aisle: 'Plumbing / Pressure pipe', says, rows, size, source,
  settings: [{ key: 'length', label: 'Length, mm', type: 'number', default: 500 }],
  cannot: (_q, _s, set) => (len(set) > 0 ? null : `a length above 0 (${String(set.length)} mm)`),
  recipe: ([od, t], sz, set) => made(`${sz} pipe`, mat, { tube: [mm(od / 2 - t), mm(od / 2), len(set)] }, { color }),
  expect: ([od, t], _s, set) => ({ bound: [mm(od), len(set), mm(od)], mass: annV(mm(od / 2 - t), mm(od / 2), len(set)) * rho(mat), tol: 0.01, massTol: 0.02, says: 'its outside by its length; nominal mass, the tube' }),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: [`${size} pipe/axis`] } }] });
const PPRPIPE = pressurePipe('piece.pprpipe', 'PP-R pipe (DIN 8077)', 'A length of PP-R pressure pipe by its outside and class, 20 to 110 mm, PN10 to PN20',
  'A straight length of PP-R (polypropylene random) pressure pipe by its outside and pressure class (DIN 8077, 20 to 110 mm; PN10, PN16, PN20, its walls as recalled): socket-fused into its fittings; it offers its axis (`<od> PN<class> pipe/axis`)',
  PPR, '20 PN20', 'DIN 8077 as recalled (src/nexus/parts/fluid.ts PPR)', 'pp', 0x3c8d5a);
const PE100PIPE = pressurePipe('piece.pe100pipe', 'PE100 pipe (EN 12201-2)', 'A length of PE100 pressure pipe by its outside and SDR, 20 to 160 mm, SDR 11 and 17',
  'A straight length of PE100 pressure pipe (EN 12201-2, 20 to 160 mm, SDR 11 or 17, its walls as recalled): butt or electrofusion welded; it offers its axis (`<od> SDR<n> pipe/axis`)',
  PE100, '32 SDR11', 'EN 12201-2 as recalled (src/nexus/parts/fluid.ts PE100)', 'pe', BLACK);

/** Every pneumatic, hydraulic and plumbing family this file makes (most used first), registered in parts/index.ts. */

// ---- circulating pumps (package P5): an inline pump by its row, its curve the points a maker's chart gives -----------
/** Small inline circulating pumps, typical of 15 mm wet-rotor circulators: body length L, outside D, its waterway di, the
 *  copper tube its compression ends take, its motor can's outside and height, mm; its curve, flow (L/min) against head
 *  (m), typical of makers' charts for the class (no maker's own table to hand: each figure typical). */
export const PUMP_ROWS: Record<string, { L: number; D: number; di: number; tube: number; can: number; canH: number; curve: [number, number][] }> = {
  'circulator 15-40': { L: 130, D: 60, di: 13, tube: 15, can: 90, canH: 95, curve: [[0, 4.0], [10, 3.7], [20, 3.1], [30, 2.1], [40, 0.8]] },
  'circulator 15-60': { L: 130, D: 60, di: 13, tube: 15, can: 95, canH: 100, curve: [[0, 6.0], [15, 5.6], [30, 4.6], [45, 2.9], [55, 1.4]] },
};
const CIRCULATOR: PartFamily<(typeof PUMP_ROWS)[string]> = {
  id: 'piece.pump', name: 'Circulating pump', gloss: 'An inline circulating pump by its class (15-40, 15-60): its body along the flow, its motor can on top, its curve on its ends', domains: ['mechanical', 'pipelines'], aisle: 'Plumbing / Pumps',
  says: 'A small inline circulating pump (sizes and curve typical of 15 mm wet-rotor circulators): its body a tube laid along the flow (x) with 15 mm compression ends, its motor can stood on it. Its body\'s line says it is a pump and carries its curve (flow against head, typical of makers\' charts), for fluid.network to meet the system curve with. Approximated: the impeller and volute inside not drawn',
  rows: PUMP_ROWS, size: 'circulator 15-60', source: 'typical of 15 mm wet-rotor circulators and their makers\' charts (src/nexus/parts/fluid.ts PUMP_ROWS)',
  recipe: (q, size) => { const n = `${size} pump`;
    const body = turn(made(`${n} body`, 'cast-iron', { tube: [mm(q.di) / 2, mm(q.D) / 2, mm(q.L)] }, { color: 0x2a5db0 }), 2, 90);
    const can = made(`${n} motor can`, 'steel-low', { cyl: [mm(q.can) / 2, mm(q.canH)] }, { color: 0x1c1c1c });
    return Block.lined(onto(body, '+y', can, 'touch'), (l) => (l.port === `${n} body/axis` ? { kind: 'fluid', size: { role: 'pump', d: mm(q.tube), di: mm(q.di), curve: q.curve.map(([Q, H]) => `${Q}:${H}`).join('; ') }, std: `compression ends for ${q.tube} mm EN 1057 tube (EN 1254-2, typical)` } : undefined)); },
  tests: [{ inputs: {}, outputs: { pieces: 2, offers: ['circulator 15-60 pump body/axis', 'circulator 15-60 pump motor can/axis'] } }],
};
export const FLUID = [CYL6432, CYL15552, HYDCYL, VALVE, NPTELBOW, NPTTEE, NPTCOUPLING, NPTNIPPLE, NPTPLUG, NPTCAP, NPTBUSHING, NPTELBOW45, NPTCROSS, NPTUNION, COMPCOUPLING, COMPELBOW, COMPTEE, COMPSTOPEND,
  PEXPIPE, PEXMETRIC, PEXRING, PEXCOUPLING, PEXELBOW, PEXTEE, QCOUPLER, QPLUG, JICUNION, JICELBOW, JICELBOW45, JICTEE, JICCAP, JICPLUG, ORFSUNION, ORFSELBOW, ORFSTEE, ORBPLUG, ORBJIC, HYDHOSE, HYDHOSER1, BONDEDSEAL, GAUGES, FILTERREGULATOR, SILENCERS,
  GATEVALVE, PPRPIPE, PE100PIPE, HOSEFEMALE, HOSEMALE, CIRCULATOR] as PartFamily<unknown>[];
/** Their piece nodes (registered with the maker's check.row by familyNode). */
export const FLUID_NODES: BlockDef[] = [...FLUID.map((f) => familyNode(f)), FLUID_NETWORK];
