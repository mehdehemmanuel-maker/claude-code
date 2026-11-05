// Plumbing and fluid (decision 0026, step 2): the table-driven families of pipe, fittings, valves, hose, flanges and
// tanks, each a table of rows and one recipe of the room operations (src/nexus/room.ts), no place written by hand. Every
// fitting offers its ports as lines along their axes (`<name> port 1/axis`, …), a pipe's or a hose's for what goes over
// or through it; a tank its side ports on its face (`<name>/ports`) and its cavity.
//
// Copied, with their notices, as decision 0026 allows for permissive files (read 2026-11-05):
//
//   ISO228 (bd_warehouse src/bd_warehouse/data/iso_228_1.csv) and ASME_FLANGE (bd_warehouse src/bd_warehouse/flange.py,
//   its ASME B16.5 Tables 7 to 10 for classes 150 and 300), from https://github.com/gumyr/bd_warehouse:
//
//     Copyright 2023, 2024 Gumyr
//
//     Licensed under the Apache License, Version 2.0 (the "License");
//     you may not use this file except in compliance with the License.
//     You may obtain a copy of the License at
//
//         http://www.apache.org/licenses/LICENSE-2.0
//
//     Unless required by applicable law or agreed to in writing, software
//     distributed under the License is distributed on an "AS IS" BASIS,
//     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//     See the License for the specific language governing permissions and
//     limitations under the License.
//
//   EN1092_PN6 (BOLTS data/flanges.blt, its classes plateflange and blindflange, EN 1092-1 PN6 types 01 and 05), from
//   https://github.com/boltsparts/BOLTS:
//
//     Copyright (c) 2014 Fabrizio Pollastri <f.pollastri@inrim.it>
//
//     Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
//     documentation files (the "Software"), to deal in the Software without restriction, including without limitation
//     the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
//     permit persons to whom the Software is furnished to do so, subject to the following conditions:
//
//     The above copyright notice and this permission notice shall be included in all copies or substantial portions of
//     the Software.
//
//     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
//     THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//     AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
//     CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
//     IN THE SOFTWARE.
//
// Changes made here: ISO 228-1's tolerance columns left out; of B16.5's tables only the columns the slip-on and blind
// flanges read (O, tf, X, Y and B of Tables 8 and 10; the bolt circle, hole and count of Tables 7 and 9), the hole from
// inches to mm; EN 1092-1's two classes joined into one row (they differ only in thickness). Written by a script (not
// kept in the repo) from the files, read as text. Not cross-checked against the copyleft tables: a task left open.
//
// Everything else here is typical (makers' catalogue proportions, not read from a standard to hand), each table saying
// so in PLUMBING_SOURCES and PLUMBING_STATUS: malleable-iron and brass fittings after EN 10242 proportions, push-in
// fittings, hose barbs, valves, PVC-U and copper fittings, hoses, clamps and tanks. A figure recalled from a standard but
// not read from it here is labelled typical, never specified.

import { branch, made, onto, run, stack, turn, type Block, type RunSeg } from '../room';
import { densityKg } from '../mass';
import type { Expect, PartFamily } from './maker';

const mm = (x: number): number => x / 1000;
const rho = (mat: string): number => { const d = densityKg(mat); if (d === undefined) throw new Error(`no density for ${mat}`); return d; };
const annV = (ri: number, ro: number, h: number) => Math.PI * (ro * ro - ri * ri) * h;
const bendV = (ri: number, ro: number, R: number, deg: number) => Math.PI * (ro * ro - ri * ri) * R * (deg * Math.PI) / 180;
const hexV = (af: number, h: number, ri = 0) => ((Math.sqrt(3) / 2) * af * af - Math.PI * ri * ri) * h;
const cupV = (r: number, h: number, wall: number, floor: number) => Math.PI * r * r * h - Math.PI * (r - wall) ** 2 * (h - floor);
/** A turned profile's volume, by Pappus: 2π times its first moment about the axis (its points (radius, height), closed). */
const latheV = (pts: readonly (readonly [number, number])[]) => { let s = 0; for (let i = 0; i < pts.length; i++) { const [r0, h0] = pts[i]!, [r1, h1] = pts[(i + 1) % pts.length]!; s += (r0 * h1 - r1 * h0) * (r0 + r1); } return Math.abs((Math.PI * s) / 3); };
/** What Branch takes from a tee (room.ts): the branch's end inside the run's outside (its saddle), and the run's wall opened by
 *  the branch's bore, m³, summed on a grid across the branch (both tubes of outside ro, the branch's bore rb, the run's ri). */
function teeCuts(ri: number, ro: number, rb: number): number {
  const N = 120, h = (2 * ro) / N; let v = 0;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const y = -ro + (i + 0.5) * h, z = -ro + (j + 0.5) * h, q = Math.hypot(y, z), xo = Math.sqrt(Math.max(0, ro * ro - z * z));
    if (q <= ro && q >= rb) v += xo * h * h; else if (q < rb) v += (xo - Math.sqrt(Math.max(0, ri * ri - z * z))) * h * h; }
  return v;
}
const ch = (set: Record<string, unknown>, k: string) => String(set[k]);
const len = (set: Record<string, unknown>, k = 'length') => Number(set[k]) / 1000;
const COPPER = 0xb87333, BRASS = 0xc9a23f, PVC = 0xe8e8e4, STEEL = 0x8a8c90, BLACK = 0x1c1c1c, PBT = 0x2a5db0;

// ---- the tables ----------------------------------------------------------------------------------------------------
/** ISO 228-1 parallel pipe threads, by size (bd_warehouse iso_228_1.csv): threads an inch, major, pitch and minor diameter, mm. */
export const ISO228: Record<string, [number, number, number, number]> = {
  'G1/16': [28, 7.723, 7.142, 6.561], 'G1/8': [28, 9.728, 9.147, 8.566], 'G1/4': [19, 13.157, 12.301, 11.445], 'G3/8': [19, 16.662, 15.806, 14.95], 'G1/2': [14, 20.955, 19.793, 18.631],
  'G5/8': [14, 22.911, 21.749, 20.587], 'G3/4': [14, 26.441, 25.279, 24.117], 'G7/8': [14, 30.201, 29.039, 27.877], G1: [11, 33.249, 31.77, 30.291], 'G1-1/8': [11, 37.897, 36.418, 34.939],
  'G1-1/4': [11, 41.91, 40.431, 38.952], 'G1-1/2': [11, 47.803, 46.324, 44.845], 'G1-3/4': [11, 53.746, 52.267, 50.788], G2: [11, 59.614, 58.135, 56.656], 'G2-1/4': [11, 65.71, 64.231, 62.752],
  'G2-1/2': [11, 75.184, 73.705, 72.226], 'G2-3/4': [11, 81.534, 80.055, 78.576], G3: [11, 87.884, 86.405, 84.926], 'G3-1/2': [11, 100.33, 98.851, 97.372], G4: [11, 113.03, 111.551, 110.072],
  'G4-1/2': [11, 125.73, 124.251, 122.772], G5: [11, 138.43, 136.951, 135.472], 'G5-1/2': [11, 151.13, 149.651, 148.172], G6: [11, 163.83, 162.351, 160.872],
};
/** Threaded fittings G1/8 to G2, typical of malleable-iron (EN 10242) and brass fittings: a, centre to end of an elbow or
 *  a tee; L, a socket's length; D, the outside of a female end; e, its thread's length (how far a male end goes in); af,
 *  a hex's flats; nip, a hex nipple's length; mm. */
export const G_FITTING: Record<string, { a: number; L: number; D: number; e: number; af: number; nip: number }> = {
  'G1/8': { a: 19, L: 22, D: 15, e: 7, af: 14, nip: 28 }, 'G1/4': { a: 21, L: 26, D: 19, e: 10, af: 17, nip: 32 }, 'G3/8': { a: 25, L: 29, D: 23, e: 10, af: 22, nip: 36 },
  'G1/2': { a: 28, L: 34, D: 28, e: 13, af: 27, nip: 44 }, 'G3/4': { a: 33, L: 39, D: 33, e: 15, af: 32, nip: 47 }, G1: { a: 38, L: 45, D: 40, e: 17, af: 40, nip: 53 },
  'G1-1/4': { a: 45, L: 50, D: 49, e: 19, af: 50, nip: 57 }, 'G1-1/2': { a: 50, L: 55, D: 55, e: 19, af: 55, nip: 59 }, G2: { a: 58, L: 65, D: 67, e: 24, af: 70, nip: 68 },
};
/** EN 1092-1 PN6 flanges, by DN (BOLTS flanges.blt): bore d1, bolt circle k, outside D, thickness of a plate flange (type
 *  01) and of a blind (type 05), bolt hole d2, mm, and the number of bolts. */
export const EN1092_PN6: Record<string, [number, number, number, number, number, number, number]> = {
  DN15: [22, 55, 80, 12, 12, 11, 4], DN20: [27.5, 65, 90, 14, 14, 11, 4], DN25: [34.5, 75, 100, 14, 14, 11, 4], DN32: [43.5, 90, 120, 16, 14, 14, 4], DN40: [49.5, 100, 130, 16, 14, 14, 4], DN50: [61.5, 110, 140, 16, 14, 14, 4],
  DN65: [77.5, 130, 160, 16, 14, 14, 4], DN80: [90.5, 150, 190, 18, 16, 18, 4], DN100: [116, 170, 210, 18, 16, 18, 4], DN125: [141.5, 200, 240, 20, 18, 18, 8], DN150: [170.5, 225, 265, 20, 18, 18, 8],
  DN200: [221.5, 280, 320, 22, 20, 18, 8], DN250: [276.5, 335, 375, 24, 22, 18, 12], DN300: [327.5, 395, 440, 24, 22, 22, 12], DN350: [359.5, 445, 490, 26, 22, 22, 12], DN400: [411, 495, 540, 28, 22, 22, 16],
  DN450: [462, 550, 595, 30, 24, 22, 16], DN500: [513.5, 600, 645, 30, 24, 22, 20], DN600: [616.5, 705, 755, 32, 30, 26, 20], DN700: [714.2, 810, 860, 40, 40, 26, 24], DN800: [815.8, 920, 975, 44, 44, 30, 24],
  DN900: [917.4, 1020, 1075, 48, 48, 30, 24], DN1000: [1019, 1120, 1175, 52, 52, 30, 28], DN1200: [1224, 1340, 1405, 60, 60, 33, 32], DN1400: [1424, 1560, 1630, 72, 68, 36, 36], DN1600: [1624, 1760, 1830, 80, 76, 36, 40],
  DN1800: [1826, 1970, 2045, 88, 84, 39, 44], DN2000: [2026, 2180, 2265, 96, 92, 42, 48],
};
/** ASME B16.5 flanges, classes 150 and 300, by NPS (bd_warehouse flange.py): outside O, thickness tf, hub X, length
 *  through the hub Y and bore B of a slip-on, bolt circle W and hole, mm, and the number of bolts. */
type AsmeRow = [number, number, number, number, number, number, number, number];
export const ASME_FLANGE: Record<string, { c150: AsmeRow; c300: AsmeRow }> = Object.fromEntries((() => {
  const c150: Record<string, AsmeRow> = { '1/2': [90, 9.6, 30, 14, 22.2, 60.3, 15.88, 4], '3/4': [100, 11.2, 38, 14, 27.7, 69.9, 15.88, 4], '1': [110, 12.7, 49, 16, 34.5, 79.4, 15.88, 4], '1-1/4': [115, 14.3, 59, 19, 43.2, 88.9, 15.88, 4], '1-1/2': [125, 15.9, 65, 21, 49.5, 98.4, 15.88, 4], '2': [150, 17.5, 78, 24, 61.9, 120.7, 19.05, 4], '2-1/2': [180, 20.7, 90, 27, 74.6, 139.7, 19.05, 4], '3': [190, 22.3, 108, 29, 90.7, 152.4, 19.05, 4], '3-1/2': [215, 22.3, 122, 30, 103.4, 177.8, 19.05, 8], '4': [230, 22.3, 135, 32, 116.1, 190.5, 19.05, 8], '5': [255, 22.3, 164, 35, 143.8, 215.9, 22.22, 8], '6': [280, 23.9, 192, 38, 170.7, 241.3, 22.22, 8], '8': [345, 27, 246, 43, 221.5, 298.5, 22.22, 8], '10': [405, 28.6, 305, 48, 276.2, 362, 25.4, 12], '12': [485, 30.2, 365, 54, 327, 431.8, 25.4, 12], '14': [535, 33.4, 400, 56, 359.2, 476.3, 28.57, 12], '16': [595, 35, 457, 62, 410.5, 539.8, 28.57, 16], '18': [635, 38.1, 505, 67, 461.8, 577.9, 31.75, 16], '20': [700, 41.3, 559, 71, 513.1, 635, 31.75, 20], '22': [750, 44.5, 610, 78, 564.4, 692.2, 34.92, 20], '24': [815, 46.1, 663, 81, 616, 749.3, 34.92, 20] };
  const c300: Record<string, AsmeRow> = { '1/2': [95, 12.7, 38, 21, 22.2, 66.7, 15.88, 4], '3/4': [115, 14.3, 48, 24, 27.7, 82.6, 19.05, 4], '1': [125, 15.9, 54, 25, 34.5, 88.9, 19.05, 4], '1-1/4': [135, 17.5, 64, 25, 43.2, 98.4, 19.05, 4], '1-1/2': [155, 19.1, 70, 29, 49.5, 114.3, 22.22, 4], '2': [165, 20.7, 84, 32, 61.9, 127, 19.05, 8], '2-1/2': [190, 23.9, 100, 37, 74.6, 149.2, 22.22, 8], '3': [210, 27, 117, 41, 90.7, 168.3, 22.22, 8], '3-1/2': [230, 28.6, 133, 43, 103.4, 184.2, 22.22, 8], '4': [255, 30.2, 146, 46, 116.1, 200, 22.22, 8], '5': [280, 33.4, 178, 49, 143.8, 235, 22.22, 8], '6': [320, 35, 206, 51, 170.7, 269.9, 22.22, 12], '8': [380, 39.7, 260, 60, 221.5, 330.2, 25.4, 12], '10': [445, 46.1, 321, 65, 276.2, 387.4, 28.57, 16], '12': [520, 49.3, 375, 71, 327, 450.8, 31.75, 16], '14': [585, 52.4, 425, 75, 359.2, 514.4, 31.75, 20], '16': [650, 55.6, 483, 81, 410.5, 571.5, 34.92, 20], '18': [710, 58.8, 533, 87, 461.8, 628.6, 34.92, 24], '20': [775, 62, 587, 94, 513.1, 685.8, 34.92, 24], '22': [840, 65.1, 640, 100, 564.4, 743, 41.27, 24], '24': [915, 68.3, 702, 105, 616, 812.8, 41.27, 24] };
  return Object.keys(c150).map((k) => [k, { c150: c150[k]!, c300: c300[k]! }]);
})());
/** EN 1057 copper tube: its outsides and the walls sold, mm (as src/nexus/kinds/fluid.ts holds them). */
export const EN1057: Record<number, number[]> = { 6: [0.6, 0.8, 1], 8: [0.6, 0.8, 1], 10: [0.7, 0.8, 1], 12: [0.8, 1], 15: [0.7, 1], 18: [0.8, 1], 22: [0.9, 1, 1.2], 28: [0.9, 1, 1.2], 35: [1.2, 1.5], 42: [1.2, 1.5], 54: [1.2, 1.5, 2] };
/** Capillary (end-feed) fittings for EN 1057 tube, after EN 1254-1, typical of makers' tables: socket depth, wall and an
 *  elbow's bend radius to its middle line, mm (15, 22 and 28 as common.ts ELBOWS). */
export const CU_FITTING: Record<number, { socket: number; wall: number; R: number }> = { 15: { socket: 11, wall: 1, R: 10 }, 18: { socket: 13, wall: 1.1, R: 12 }, 22: { socket: 15, wall: 1.2, R: 14 }, 28: { socket: 18, wall: 1.2, R: 18 }, 35: { socket: 23, wall: 1.4, R: 23 }, 42: { socket: 27, wall: 1.5, R: 28 }, 54: { socket: 32, wall: 1.8, R: 36 } };
/** PVC-U pressure pipe DN15 to DN50 by its outside, with the PN16 (SDR 13.6) walls commonly listed for EN 1452-2, mm:
 *  typical (not read from the standard here); a solvent socket's depth 0.5 × the outside + 6 mm (the ISO 727 rule, as
 *  recalled, typical) and its wall typical. */
export const PVC_PIPE: Record<string, { od: number; wall: number; socketWall: number }> = {
  DN15: { od: 20, wall: 1.5, socketWall: 2.5 }, DN20: { od: 25, wall: 1.9, socketWall: 2.8 }, DN25: { od: 32, wall: 2.4, socketWall: 3.2 }, DN32: { od: 40, wall: 3, socketWall: 3.7 }, DN40: { od: 50, wall: 3.7, socketWall: 4.3 }, DN50: { od: 63, wall: 4.7, socketWall: 5.1 },
};
/** Push-in fittings for plastic air tube by the tube's outside, typical of makers' pages: the body's outside, the
 *  collet's, how far the tube goes in, mm, and the thread of a male stud. */
export const PUSHFIT: Record<string, { body: number; collet: number; depth: number; thread: string }> = {
  '4': { body: 10, collet: 8, depth: 13, thread: 'G1/8' }, '6': { body: 12, collet: 10, depth: 15, thread: 'G1/8' }, '8': { body: 14.5, collet: 12.5, depth: 17, thread: 'G1/4' }, '10': { body: 17, collet: 15, depth: 19, thread: 'G3/8' }, '12': { body: 20, collet: 17.5, depth: 21, thread: 'G1/2' },
};
/** Pneumatic tube, outside × bore, mm (the sizes src/nexus/kinds/fluid.ts lists, as sold). */
export const AIR_TUBE: Record<string, [number, number]> = { '4x2.5': [4, 2.5], '6x4': [6, 4], '8x5': [8, 5], '8x6': [8, 6], '10x6.5': [10, 6.5], '10x7': [10, 7], '12x8': [12, 8], '12x9': [12, 9], '16x11': [16, 11], '16x12': [16, 12] };
/** Hose barbs by the hose's bore, mm: the thread of the end it screws in by (typical of makers' pages). */
export const HOSE_BARB: Record<string, string> = { '4': 'G1/8', '6': 'G1/4', '8': 'G1/4', '10': 'G3/8', '12': 'G1/2', '16': 'G1/2', '19': 'G3/4', '25': 'G1' };
/** Soft hose by its bore: its wall, mm (typical of the walls src/nexus/kinds/fluid.ts allows for that bore). */
export const SOFT_HOSE: Record<string, number> = { '3': 1.5, '4': 1.5, '5': 1.5, '6': 2, '8': 2, '10': 3, '12': 3, '13': 3, '16': 3, '19': 4, '25': 5, '32': 5, '38': 6, '50': 6 };
/** Worm-drive hose clamps, DIN 3017 ranges (as src/nexus/kinds/fluid.ts holds them): least and largest diameter, mm; the
 *  band 9 mm wide to 16 mm, 12 mm above (as kinds says), its thickness typical. */
export const HOSE_CLAMP: Record<string, [number, number]> = { '8-12': [8, 12], '10-16': [10, 16], '12-20': [12, 20], '16-25': [16, 25], '20-32': [20, 32], '25-40': [25, 40], '32-50': [32, 50], '40-60': [40, 60], '50-70': [50, 70], '60-80': [60, 80], '70-90': [70, 90], '80-100': [80, 100], '90-110': [90, 110], '100-120': [100, 120] };
/** Rectangular tanks, rotomoulded polyethylene, open at the top, by their capacity: outside width, height, depth and
 *  wall, mm (typical, sized to hold at least the capacity). */
export const TANKS: Record<string, [number, number, number, number]> = { '10 L': [300, 200, 200, 4], '25 L': [400, 250, 300, 5], '50 L': [500, 300, 400, 5], '100 L': [600, 400, 500, 6], '200 L': [800, 500, 600, 6], '500 L': [1000, 700, 800, 8], '1000 L': [1200, 1000, 1000, 10] };

export const PLUMBING_SOURCES: Record<string, string> = {
  ISO228: 'ISO 228-1 as bd_warehouse gives it (iso_228_1.csv, Apache-2.0)', ASME_FLANGE: 'ASME B16.5 Tables 7 to 10 as bd_warehouse gives them (flange.py, Apache-2.0)',
  EN1092_PN6: 'EN 1092-1 PN6 types 01 and 05 as BOLTS gives them (flanges.blt, MIT), after zetamec.com', EN1057: 'EN 1057 outsides and walls, as src/nexus/kinds/fluid.ts holds them',
  G_FITTING: 'typical of malleable-iron fittings after EN 10242 and brass fittings, makers\' proportions', CU_FITTING: 'typical of EN 1254-1 capillary fittings, makers\' tables',
  PVC_PIPE: 'typical: PN16 walls commonly listed for EN 1452-2, the ISO 727 socket rule as recalled', PUSHFIT: 'typical of push-in fitting makers\' pages', AIR_TUBE: 'the sizes sold, as src/nexus/kinds/fluid.ts lists them',
  HOSE_BARB: 'typical of hose barb makers\' pages', SOFT_HOSE: 'typical hose walls', HOSE_CLAMP: 'DIN 3017 ranges as src/nexus/kinds/fluid.ts holds them, the band typical', TANKS: 'typical rotomoulded tanks',
  PLUMBING: 'the families made from the tables above, each saying its own source',
};
export const PLUMBING_STATUS: Record<string, string> = {
  ISO228: 'specified', ASME_FLANGE: 'specified', EN1092_PN6: 'specified', EN1057: 'specified', G_FITTING: 'estimated', CU_FITTING: 'estimated', PVC_PIPE: 'estimated', PUSHFIT: 'estimated', AIR_TUBE: 'specified',
  HOSE_BARB: 'estimated', SOFT_HOSE: 'estimated', HOSE_CLAMP: 'estimated', TANKS: 'estimated', PLUMBING: 'estimated',
};

// ---- socket fittings: a run of sockets and a body, its branch joined into its side ---------------------------------
/** A socket fitting's sizes, m: its sockets' bore and outside, their depth, the body's bore, an elbow's bend radius, a
 *  coupling's stop, its material and look. */
type Sock = { ri: number; ro: number; depth: number; bore: number; R: number; stop: number; mat: string; color: number };
const SOCK_TYPES = ['elbow 90', 'elbow 45', 'tee', 'coupling', 'cap'];
function sockFitting(n: string, k: Sock, type: string): Block {
  const s = (nm: string): RunSeg => ({ name: nm, mat: k.mat, ri: k.ri, ro: k.ro, color: k.color, straight: k.depth });
  const body = (nm: string, L: number): RunSeg => ({ name: nm, mat: k.mat, ri: k.bore, ro: k.ro, color: k.color, straight: L });
  if (type === 'elbow 90' || type === 'elbow 45') return run(n, [s(`${n} port 1`), { name: `${n} body`, mat: k.mat, ri: k.bore, ro: k.ro, color: k.color, bend: type === 'elbow 90' ? 90 : 45, R: k.R }, s(`${n} port 2`)]);
  if (type === 'tee') return branch(run(n, [s(`${n} port 1`), body(`${n} body`, 2 * k.ro + mm(2)), s(`${n} port 2`)]), `${n} body/axis`, run(`${n} branch`, [body(`${n} branch body`, k.ro + mm(1)), s(`${n} port 3`)]), 0);
  if (type === 'coupling') return run(n, [s(`${n} port 1`), body(`${n} stop`, k.stop), s(`${n} port 2`)]);
  return made(`${n} port 1`, k.mat, { cup: [k.ro, k.depth + (k.ro - k.ri), k.ro - k.ri, k.ro - k.ri] }, { color: k.color });
}
function sockExpect(k: Sock, type: string, says: string): Expect {
  const d = rho(k.mat), sockets = (m: number) => m * annV(k.ri, k.ro, k.depth);
  if (type === 'elbow 90') return { bound: [k.R + k.depth + k.ro, k.depth + k.R + k.ro, 2 * k.ro], mass: (sockets(2) + bendV(k.bore, k.ro, k.R, 90)) * d, tol: 0.01, massTol: 0.03, says: `${says}; an elbow's reach, centre to its socket's mouth and its outside; nominal mass, its sockets and its bend` };
  if (type === 'elbow 45') return { mass: (sockets(2) + bendV(k.bore, k.ro, k.R, 45)) * d, tol: 0.01, massTol: 0.03, says: `${says}; nominal mass, its sockets and its bend` };
  if (type === 'tee') return { bound: [2 * k.ro + mm(1) + k.depth, 2 * k.depth + 2 * k.ro + mm(2), 2 * k.ro], mass: (sockets(3) + annV(k.bore, k.ro, 3 * k.ro + mm(3)) - teeCuts(k.bore, k.ro, k.bore)) * d, tol: 0.01, massTol: 0.05, says: `${says}; a tee's run and branch; nominal mass, its sockets and bodies less what joining the branch takes` };
  if (type === 'coupling') return { bound: [2 * k.ro, 2 * k.depth + k.stop, 2 * k.ro], mass: (sockets(2) + annV(k.bore, k.ro, k.stop)) * d, tol: 0.01, massTol: 0.03, says: `${says}; its outside by its sockets and stop; nominal mass, the tubes` };
  const w = k.ro - k.ri; return { bound: [2 * k.ro, k.depth + w, 2 * k.ro], mass: cupV(k.ro, k.depth + w, w, w) * d, tol: 0.01, massTol: 0.03, says: `${says}; a cap's outside by its socket and end; nominal mass, the cup` };
}

// ---- threaded fittings, G1/8 to G2 -------------------------------------------------------------------------------
type GRow = { d: number; minor: number; a: number; L: number; D: number; e: number; af: number; nip: number };
const G_ROWS: Record<string, GRow> = Object.fromEntries(Object.entries(G_FITTING).map(([k, f]) => [k, { d: ISO228[k]![1], minor: ISO228[k]![3], ...f }]));
const G_SIZES = Object.keys(G_ROWS);
const G_MAT: Record<string, string> = { brass: 'brass', 'malleable iron': 'cast-iron', stainless: 'stainless-304' };
const G_TYPES = ['elbow', 'tee', 'cross', 'socket', 'nipple', 'cap', 'plug', 'union', 'reducer'];
/** a threaded fitting's sizes, m: the female end's bore (the thread's major diameter: the thread not drawn) and outside,
 *  its depth, the waterway's radius (0.4 × the thread, typical), and the rest of its row */
const gk = (g: GRow) => ({ rt: mm(g.d) / 2, ro: mm(g.D) / 2, e: mm(g.e), rb: 0.4 * mm(g.d), a: mm(g.a), L: mm(g.L), af: mm(g.af), nip: mm(g.nip), afn: mm(Math.round(1.25 * g.D)), Lu: mm(Math.round(1.45 * g.L)), hh: Math.max(mm(4), 0.4 * mm(g.e)) });
const smaller = (size: string) => G_SIZES[G_SIZES.indexOf(size) - 1];
function gFitting(g: GRow, size: string, set: Record<string, unknown>): Block {
  const k = gk(g), mat = G_MAT[ch(set, 'matter')] ?? 'brass', color = mat === 'brass' ? BRASS : STEEL, type = ch(set, 'type'), n = `${size} ${type}`;
  const hub = (nm: string): RunSeg => ({ name: nm, mat, ri: k.rt, ro: k.ro, color, straight: k.e }), body = (nm: string, L: number): RunSeg => ({ name: nm, mat, ri: k.rb, ro: k.ro, color, straight: L });
  const arm = (nm: string, i: number) => run(`${n} ${nm}`, [body(`${n} ${nm} body`, k.a - k.e), hub(`${n} port ${i}`)]);
  if (type === 'elbow') return run(n, [hub(`${n} port 1`), { name: `${n} body`, mat, ri: k.rb, ro: k.ro, color, bend: 90, R: k.a - k.e }, hub(`${n} port 2`)]);
  if (type === 'tee' || type === 'cross') { const t = branch(run(n, [hub(`${n} port 1`), body(`${n} body`, 2 * (k.a - k.e)), hub(`${n} port 2`)]), `${n} body/axis`, arm('branch', 3), 0); return type === 'tee' ? t : branch(t, `${n} body/axis`, arm('branch 2', 4), 180); }
  if (type === 'socket') return run(n, [hub(`${n} port 1`), body(`${n} body`, k.L - 2 * k.e), hub(`${n} port 2`)]);
  const male = (nm: string, ri = k.rb) => made(nm, mat, { tube: [ri, k.rt, k.e] }, { color });
  if (type === 'nipple') return stack(n, 1, [{ b: male(`${n} port 1`) }, { b: made(`${n} hex`, mat, { hex: [k.af, k.nip - 2 * k.e, k.rb] }, { color }) }, { b: male(`${n} port 2`) }]);
  if (type === 'cap') return made(`${n} port 1`, mat, { cup: [k.ro, k.e + k.hh, k.ro - k.rt, k.hh] }, { color });
  if (type === 'plug') return stack(n, 1, [{ b: made(`${n} port 1`, mat, { cyl: [k.rt, k.e] }, { color }) }, { b: made(`${n} head`, mat, { hex: [k.af, k.hh] }, { color }) }]);
  if (type === 'union') return stack(n, 1, [{ b: made(`${n} port 1`, mat, { tube: [k.rt, k.ro, k.e] }, { color }) }, { b: made(`${n} nut`, mat, { hex: [k.afn, k.Lu - 2 * k.e, k.rb] }, { color }) }, { b: made(`${n} port 2`, mat, { tube: [k.rt, k.ro, k.e] }, { color }) }]);
  // (a reducing bush: this size's male thread outside, the next smaller's female thread through it, a hex to turn it by)
  const s = gk(G_ROWS[smaller(size)!]!);
  return stack(n, 1, [{ b: male(`${n} port 1`, s.rt) }, { b: made(`${n} port 2`, mat, { hex: [k.af, k.hh, s.rt] }, { color }) }]);
}
function gExpect(g: GRow, size: string, set: Record<string, unknown>): Expect {
  const k = gk(g), d = rho(G_MAT[ch(set, 'matter')] ?? 'brass'), type = ch(set, 'type'), hubs = (m: number) => m * annV(k.rt, k.ro, k.e), cor = (af: number) => (2 * af) / Math.sqrt(3), says = 'its row\'s sizes (typical, EN 10242 proportions)';
  const arm = annV(k.rb, k.ro, k.a - k.e), cut = teeCuts(k.rb, k.ro, k.rb);
  switch (type) {
    case 'elbow': return { bound: [k.a + k.ro, k.a + k.ro, 2 * k.ro], mass: (hubs(2) + bendV(k.rb, k.ro, k.a - k.e, 90)) * d, tol: 0.01, massTol: 0.03, says: `${says}; centre to end a and its outside; nominal mass, its ends and bend` };
    case 'tee': return { bound: [k.a + k.ro, 2 * k.a, 2 * k.ro], mass: (hubs(3) + annV(k.rb, k.ro, 2 * (k.a - k.e)) + arm - cut) * d, tol: 0.01, massTol: 0.05, says: `${says}; centre to end a each way; nominal mass, less what joining the branch takes` };
    case 'cross': return { bound: [2 * k.a, 2 * k.a, 2 * k.ro], mass: (hubs(4) + annV(k.rb, k.ro, 2 * (k.a - k.e)) + 2 * (arm - cut)) * d, tol: 0.01, massTol: 0.05, says: `${says}; centre to end a each way; nominal mass, less what joining the branches takes` };
    case 'socket': return { bound: [2 * k.ro, k.L, 2 * k.ro], mass: (hubs(2) + annV(k.rb, k.ro, k.L - 2 * k.e)) * d, tol: 0.01, massTol: 0.03, says: `${says}; its outside by its length; nominal mass, the tubes` };
    case 'nipple': return { bound: [cor(k.af), k.nip, cor(k.af)], mass: (2 * annV(k.rb, k.rt, k.e) + hexV(k.af, k.nip - 2 * k.e, k.rb)) * d, tol: 0.01, massTol: 0.03, says: `${says}; its hex across corners by its length; nominal mass, its ends and hex` };
    case 'cap': return { bound: [2 * k.ro, k.e + k.hh, 2 * k.ro], mass: cupV(k.ro, k.e + k.hh, k.ro - k.rt, k.hh) * d, tol: 0.01, massTol: 0.03, says: `${says}; nominal mass, the cup` };
    case 'plug': return { bound: [cor(k.af), k.e + k.hh, cor(k.af)], mass: (Math.PI * k.rt * k.rt * k.e + hexV(k.af, k.hh)) * d, tol: 0.01, massTol: 0.03, says: `${says}; its head across corners; nominal mass, its thread and head` };
    case 'union': return { bound: [cor(k.afn), k.Lu, cor(k.afn)], mass: (hubs(2) + hexV(k.afn, k.Lu - 2 * k.e, k.rb)) * d, tol: 0.01, massTol: 0.03, says: `${says}; its nut across corners by its length; nominal mass, its ends and nut` };
    default: { const s = gk(G_ROWS[smaller(size)!]!); return { bound: [cor(k.af), k.e + k.hh, cor(k.af)], mass: (annV(s.rt, k.rt, k.e) + hexV(k.af, k.hh, s.rt)) * d, tol: 0.01, massTol: 0.03, says: `${says}; its hex across corners; nominal mass, its thread and hex` }; }
  }
}
const GFITTING: PartFamily<GRow> = {
  id: 'piece.gfitting', name: 'Threaded pipe fitting', gloss: 'A threaded pipe fitting by its ISO 228-1 size, G1/8 to G2: elbow, tee, cross, socket, nipple, cap, plug, union or reducing bush', domains: ['mechanical', 'pipelines', 'everyday'],
  says: 'A threaded pipe fitting (ISO 228-1 sizes G1/8 to G2; its proportions typical of EN 10242 malleable iron and brass): an elbow, tee or cross laid as a run of its female ends and body (a branch joined into its side), a socket, a hex nipple, a cap, a plug, a union or a reducing bush to the next size down. Its threads not drawn: a female end\'s bore is the thread\'s major diameter. Each end offers its axis (`<size> <type> port 1/axis`…), for a pipe or a nipple along it',
  rows: G_ROWS, size: 'G1/2', source: 'ISO 228-1 thread sizes as bd_warehouse gives them (iso_228_1.csv); the fittings\' proportions typical of EN 10242 (src/nexus/parts/plumbing.ts G_FITTING)',
  settings: [{ key: 'type', label: 'Type', type: 'choice', default: 'elbow', choices: G_TYPES }, { key: 'matter', label: 'Made of', type: 'choice', default: 'brass', choices: Object.keys(G_MAT) }],
  cannot: (_g, size, set) => (!G_TYPES.includes(ch(set, 'type')) ? `a type of ${G_TYPES.join(', ')} (${ch(set, 'type')})` : ch(set, 'type') === 'reducer' && !smaller(size) ? `ISO 228-1 has no size here below ${size} to reduce to` : null),
  recipe: gFitting, expect: gExpect,
  tests: [{ inputs: {}, outputs: { pieces: 3, offers: ['G1/2 elbow port 1/axis', 'G1/2 elbow port 2/axis'] } }, { set: { type: 'tee' }, inputs: {}, outputs: { pieces: 5 } }],
};

// ---- valves ------------------------------------------------------------------------------------------------------
/** A valve body turned about its flow (along y): female ends of its thread's depth, shoulders, a middle swelled to rm, its
 *  waterway rb; mm in, points (radius, height) in m. */
const valveBody = (d: number, rh: number, rm: number, e: number, Lb: number, rb: number): [number, number][] => {
  const c = Math.max(0, rm - rh), y0 = e + 2 + c, y1 = Lb - e - 2 - c;
  return ([[d / 2, 0], [rh, 0], [rh, e + 2], [rm, y0], [rm, y1], [rh, Lb - e - 2], [rh, Lb], [d / 2, Lb], [d / 2, Lb - e], [rb, Lb - e], [rb, e], [d / 2, e]] as [number, number][]).map(([r, h]) => [mm(r), mm(h)]);
};
type VRow = GRow;
const V_MAT: Record<string, string> = { brass: 'brass', stainless: 'stainless-304' };
// (a ball valve's body, its sizes worked from its thread by ratios read off makers' drawings: an estimate)
const ballOf = (g: VRow) => { const d = g.d, Lb = 2.6 * d + 2, rh = g.D / 2, rm = 0.85 * d, rb = 0.36 * d; return { pts: valveBody(d, rh, rm, g.e, Lb, rb), Lb: mm(Lb), rm: mm(Math.max(rm, rh)), rs: mm(Math.max(2.5, 0.15 * d)), hs: mm(0.6 * d + 8), ll: mm(4 * d + 20), tl: mm(Math.max(3, 0.12 * d)), wl: mm(Math.max(10, 0.6 * d)), af: mm(3.2 * Math.max(2.5, 0.15 * d)), nh: mm(1.6 * Math.max(2.5, 0.15 * d)) }; };
const VALVE_ROWS: Record<string, VRow> = Object.fromEntries(Object.entries(G_ROWS).filter(([k]) => k !== 'G1/8'));
const BALLVALVE: PartFamily<VRow> = {
  id: 'piece.ballvalve', name: 'Ball valve', gloss: 'A two-way ball valve by its ISO 228-1 thread, G1/4 to G2: its body turned, its stem and lever on top', domains: ['mechanical', 'pipelines', 'everyday'],
  says: 'A two-way ball valve, female both ends (ISO 228-1 G1/4 to G2): its body a turned profile along the flow (its ends, shoulders and the swell round the ball), laid along x; its stem stood on top, its lever on the stem running one way from it along the flow (open), held by a nut on the stem. Approximated: the ball, its seats and the stem\'s packing inside not drawn, the threads not drawn, its sizes worked from the thread by makers\' proportions (an estimate). Its body offers the flow\'s axis (`<size> ball valve body/axis`) for a pipe or nipple at either end',
  rows: VALVE_ROWS, size: 'G1/2', source: 'ISO 228-1 sizes (bd_warehouse); the body by makers\' proportions, an estimate (src/nexus/parts/plumbing.ts)',
  settings: [{ key: 'matter', label: 'Body', type: 'choice', default: 'brass', choices: Object.keys(V_MAT) }],
  recipe: (g, size, set) => { const v = ballOf(g), mat = V_MAT[ch(set, 'matter')] ?? 'brass', n = `${size} ball valve`;
    const body = turn(made(`${n} body`, mat, { lathe: { pts: v.pts } }, { color: mat === 'brass' ? BRASS : STEEL }), 2, 90);
    // (the lever's stem point at one end, half its width in: the stem, the lever and its nut stacked aligned on it, so the
    // lever runs one way from the stem; its nut's across-flats 1.6 and height 0.8 of the stem's diameter, as ISO 4032's
    // nuts run, typical. The nut is named for its lever, not the valve: a line asked of the valve by the word means its
    // body's or its stem's)
    const lever = made(`${n} lever`, 'steel-low', { box: [v.ll, v.tl, v.wl] }, { color: 0xc0392b, pattern: { name: 'stem', points: [[-(v.ll - v.wl) / 2, 0]] } });
    const handle = stack(`${n} handle`, 1, [{ b: made(`${n} stem`, mat, { cyl: [v.rs, v.hs] }, { color: STEEL }) }, { b: lever }, { b: made(`${size} lever nut`, 'steel-low', { hex: [v.af, v.nh] }, { color: STEEL }) }], `${n} lever/stem`);
    return onto(body, '+y', handle, 'touch', `${n} stem/axis`); },
  expect: (g, _s, set) => { const v = ballOf(g), d = rho(V_MAT[ch(set, 'matter')] ?? 'brass'), rc = v.af / Math.sqrt(3);
    return { bound: [Math.max(v.Lb / 2, v.wl / 2, rc) + Math.max(v.Lb / 2, v.ll - v.wl / 2, rc), 2 * v.rm + v.hs + v.tl + v.nh, Math.max(2 * v.rm, v.wl, 2 * rc)], mass: latheV(v.pts) * d + Math.PI * v.rs * v.rs * v.hs * d + (v.ll * v.tl * v.wl + hexV(v.af, v.nh)) * rho('steel-low'), tol: 0.01, massTol: 0.03, says: 'its body\'s length and swell, its stem, its lever one way from it and its nut (an estimate); nominal mass, the body turned (Pappus), stem, lever and nut' }; },
  tests: [{ inputs: {}, outputs: { pieces: 4, offers: ['G1/2 ball valve body/axis', 'G1/2 ball valve lever/stem', 'G1/2 ball valve stem/axis', 'G1/2 lever nut/axis'] } }],
};
const checkOf = (g: VRow) => { const d = g.d, Lb = 2.2 * d + 12, rh = g.D / 2, rm = Math.max(rh + 1, 0.7 * d); return { pts: valveBody(d, rh, rm, g.e, Lb, 0.36 * d), Lb: mm(Lb), rm: mm(rm) }; };
const CHECKVALVE: PartFamily<VRow> = {
  id: 'piece.checkvalve', name: 'Check valve', gloss: 'A spring check valve by its ISO 228-1 thread, G1/4 to G2: its body turned along the flow', domains: ['mechanical', 'pipelines', 'everyday'],
  says: 'A spring (poppet) check valve, female both ends (ISO 228-1 G1/4 to G2), upright along its flow: its body a turned profile, its ends, shoulders and the swell round its poppet. Approximated: the poppet, its spring and seat inside not drawn, the threads not drawn, its sizes by makers\' proportions (an estimate). It offers its flow\'s axis (`<size> check valve/axis`)',
  rows: VALVE_ROWS, size: 'G1/2', source: 'ISO 228-1 sizes (bd_warehouse); the body by makers\' proportions, an estimate (src/nexus/parts/plumbing.ts)',
  settings: [{ key: 'matter', label: 'Body', type: 'choice', default: 'brass', choices: Object.keys(V_MAT) }],
  recipe: (g, size, set) => { const mat = V_MAT[ch(set, 'matter')] ?? 'brass'; return made(`${size} check valve`, mat, { lathe: { pts: checkOf(g).pts } }, { color: mat === 'brass' ? BRASS : STEEL }); },
  expect: (g, _s, set) => { const v = checkOf(g); return { bound: [2 * v.rm, v.Lb, 2 * v.rm], mass: latheV(v.pts) * rho(V_MAT[ch(set, 'matter')] ?? 'brass'), tol: 0.01, massTol: 0.03, says: 'its swell by its length (an estimate); nominal mass, the body turned (Pappus)' }; },
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['G1/2 check valve/axis'] } }],
};
const needleOf = (g: VRow) => { const d = g.d, Lb = 3 * d + 10, rh = g.D / 2, rm = Math.max(rh + 1, 0.75 * d + 3);
  return { pts: valveBody(d, rh, rm, g.e, Lb, 0.2 * d), Lb: mm(Lb), rm: mm(rm), af: mm(d + 4), hb: mm(0.8 * d), rs: mm(0.15 * d + 1), hs: mm(0.6 * d + 4), rk: mm(0.9 * d + 4), hk: mm(0.8 * d + 4) }; };
const NEEDLE_ROWS: Record<string, VRow> = Object.fromEntries(['G1/8', 'G1/4', 'G3/8', 'G1/2'].map((k) => [k, G_ROWS[k]!]));
const NEEDLEVALVE: PartFamily<VRow> = {
  id: 'piece.needlevalve', name: 'Needle valve', gloss: 'A needle valve by its ISO 228-1 thread, G1/8 to G1/2: its body turned, its bonnet, stem and knob on top', domains: ['mechanical', 'pipelines'],
  says: 'A needle valve, female both ends (ISO 228-1 G1/8 to G1/2): its body a turned profile laid along x, its hex bonnet, stem and knob stood on top. Approximated: the needle and seat inside and the threads not drawn, its sizes by makers\' proportions (an estimate). Its body offers the flow\'s axis (`<size> needle valve body/axis`)',
  rows: NEEDLE_ROWS, size: 'G1/4', source: 'ISO 228-1 sizes (bd_warehouse); the body by makers\' proportions, an estimate (src/nexus/parts/plumbing.ts)',
  settings: [{ key: 'matter', label: 'Body', type: 'choice', default: 'brass', choices: Object.keys(V_MAT) }],
  recipe: (g, size, set) => { const v = needleOf(g), mat = V_MAT[ch(set, 'matter')] ?? 'brass', n = `${size} needle valve`, color = mat === 'brass' ? BRASS : STEEL;
    const body = turn(made(`${n} body`, mat, { lathe: { pts: v.pts } }, { color }), 2, 90);
    const top = stack(`${n} top`, 1, [{ b: made(`${n} bonnet`, mat, { hex: [v.af, v.hb] }, { color }) }, { b: made(`${n} stem`, 'stainless-304', { cyl: [v.rs, v.hs] }, { color: STEEL }) }, { b: made(`${n} knob`, 'abs', { cyl: [v.rk, v.hk] }, { color: BLACK }) }]);
    return onto(body, '+y', top, 'touch', `${n} bonnet/axis`); },
  expect: (g, _s, set) => { const v = needleOf(g), d = rho(V_MAT[ch(set, 'matter')] ?? 'brass'), cor = (2 * v.af) / Math.sqrt(3), wide = Math.max(2 * v.rm, cor, 2 * v.rk);
    return { bound: [Math.max(v.Lb, cor, 2 * v.rk), 2 * v.rm + v.hb + v.hs + v.hk, wide], mass: latheV(v.pts) * d + hexV(v.af, v.hb) * d + Math.PI * v.rs ** 2 * v.hs * rho('stainless-304') + Math.PI * v.rk ** 2 * v.hk * rho('abs'), tol: 0.01, massTol: 0.03, says: 'its body, bonnet, stem and knob (an estimate); nominal mass, each solid' }; },
  tests: [{ inputs: {}, outputs: { pieces: 4 } }],
};

// ---- hose barbs, hose, clamps ------------------------------------------------------------------------------------
type BarbRow = { hose: number; g: GRow };
const BARB_ROWS: Record<string, BarbRow> = Object.fromEntries(Object.entries(HOSE_BARB).map(([k, t]) => [k, { hose: Number(k), g: G_ROWS[t]! }]));
/** a barb's sizes, m: its tail's ridges at the hose's bore (real ones are about a tenth bigger and stretch the hose), its
 *  root 0.85 of that, its waterway 0.35 × the hose's bore, three teeth; its male end and hex (typical) */
const barbOf = (r: BarbRow) => { const h = r.hose, rR = mm(h / 2), rr = 0.85 * rR, rb = mm(0.35 * h) / 1, p = mm(0.6 * h + 2), Lt = 3 * p + mm(2);
  const pts: [number, number][] = [[rb, 0], [rR, 0], [rr, p], [rR, p], [rr, 2 * p], [rR, 2 * p], [rr, 3 * p], [rr, Lt], [rb, Lt]];
  return { pts, rb: Math.min(rb, 0.9 * mm(r.g.d) / 2), rt: mm(r.g.d) / 2, et: 0.7 * mm(r.g.d), af: mm(r.g.af), hh: 0.35 * mm(r.g.af), Lt };
};
const HOSEBARB: PartFamily<BarbRow> = {
  id: 'piece.hosebarb', name: 'Hose barb', gloss: 'A hose barb by the bore of the hose it takes, 4 to 25 mm: its male thread, hex and barbed tail', domains: ['mechanical', 'pipelines', 'everyday'],
  says: 'A hose barb by the hose\'s bore (4 to 25 mm; its male end the thread sold for that hose, typical): its male end (the thread not drawn), its hex and its barbed tail (three teeth, turned), stacked. Its ridges drawn at the hose\'s bore (real ones are a little bigger: approximated), so a hose of that bore slides over its tail (Over a shaft on `<bore> mm hose barb tail/axis`, from lo) and a clamp over the hose',
  rows: BARB_ROWS, size: '10', source: 'typical of hose barb makers\' pages; ISO 228-1 threads (bd_warehouse) (src/nexus/parts/plumbing.ts HOSE_BARB)',
  settings: [{ key: 'matter', label: 'Made of', type: 'choice', default: 'brass', choices: ['brass', 'nylon'] }],
  recipe: (r, size, set) => { const b = barbOf(r), mat = ch(set, 'matter') === 'nylon' ? 'nylon' : 'brass', color = mat === 'brass' ? BRASS : 0xeeeeee, n = `${size} mm hose barb`;
    return stack(n, 1, [{ b: made(`${n} thread`, mat, { tube: [b.rb, b.rt, b.et] }, { color }) }, { b: made(`${n} hex`, mat, { hex: [b.af, b.hh, b.rb] }, { color }) }, { b: made(`${n} tail`, mat, { lathe: { pts: b.pts } }, { color }) }]); },
  expect: (r, _s, set) => { const b = barbOf(r), cor = (2 * b.af) / Math.sqrt(3), d = rho(ch(set, 'matter') === 'nylon' ? 'nylon' : 'brass');
    return { bound: [Math.max(cor, mm(r.hose)), b.et + b.hh + b.Lt, Math.max(cor, mm(r.hose))], mass: (annV(b.rb, b.rt, b.et) + hexV(b.af, b.hh, b.rb) + latheV(b.pts)) * d, tol: 0.01, massTol: 0.03, says: 'its hex across corners by its length (typical); nominal mass, its thread, hex and tail turned' }; },
  tests: [{ inputs: {}, outputs: { pieces: 3, offers: ['10 mm hose barb hex/axis', '10 mm hose barb tail/axis', '10 mm hose barb thread/axis'] } }],
};
const HOSE_MAT: Record<string, string> = { pvc: 'pvc', silicone: 'silicone', epdm: 'epdm', nbr: 'nbr' };
const HOSE: PartFamily<number> = {
  id: 'piece.hose', name: 'Soft hose', gloss: 'A length of soft hose by its bore, 3 to 50 mm, its wall typical', domains: ['mechanical', 'pipelines', 'everyday'],
  says: 'A straight length of soft hose (PVC, silicone, EPDM or nitrile) by its bore, its wall typical: it slides over a hose barb\'s tail (Over a shaft) and offers its own axis for a clamp over it',
  rows: SOFT_HOSE, size: '10', source: 'typical hose walls (src/nexus/parts/plumbing.ts SOFT_HOSE)',
  settings: [{ key: 'length', label: 'Length, mm', type: 'number', default: 150 }, { key: 'matter', label: 'Made of', type: 'choice', default: 'pvc', choices: Object.keys(HOSE_MAT) }],
  cannot: (_t, _s, set) => (len(set) > 0 ? null : `a length above 0 (${String(set.length)} mm)`),
  recipe: (t, size, set) => made(`${size} mm hose`, HOSE_MAT[ch(set, 'matter')] ?? 'pvc', { tube: [mm(Number(size) / 2), mm(Number(size) / 2 + t), len(set)] }, { color: ch(set, 'matter') === 'pvc' ? 0xd8e8e0 : BLACK }),
  expect: (t, size, set) => { const ri = mm(Number(size) / 2), ro = ri + mm(t); return { bound: [2 * ro, len(set), 2 * ro], mass: annV(ri, ro, len(set)) * rho(HOSE_MAT[ch(set, 'matter')] ?? 'pvc'), tol: 0.01, massTol: 0.02, says: 'its outside by its length; nominal mass, the tube' }; },
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['10 mm hose/axis'] } }],
};
const clampOf = ([, hi]: [number, number]) => ({ ri: mm(hi / 2), t: mm(hi <= 16 ? 0.6 : 0.8), w: mm(hi <= 16 ? 9 : 12), hx: mm(6 + 0.04 * hi), hz: mm(14) });
const HOSECLAMP: PartFamily<[number, number]> = {
  id: 'piece.hoseclamp', name: 'Hose clamp', gloss: 'A worm-drive hose clamp by its DIN 3017 range, 8–12 to 100–120 mm', domains: ['mechanical', 'pipelines', 'everyday'],
  says: 'A worm-drive hose clamp by its DIN 3017 range: its band drawn open at the range\'s largest diameter (9 mm wide to 16 mm, 12 mm above), so it slides over a hose (Over a shaft); its worm housing drawn against the band\'s side if asked (housing yes: then it no longer slides over, being not round). Approximated: the band a closed ring, its slots and screw not drawn',
  rows: HOSE_CLAMP, size: '16-25', source: 'DIN 3017 ranges and band widths as src/nexus/kinds/fluid.ts holds them, the band\'s thickness typical (src/nexus/parts/plumbing.ts HOSE_CLAMP)',
  settings: [{ key: 'housing', label: 'Its worm housing drawn', type: 'choice', default: 'no', choices: ['no', 'yes'] }, { key: 'grade', label: 'Grade', type: 'choice', default: 'W4', choices: ['W1', 'W2', 'W4'] }],
  recipe: (r, size, set) => { const c = clampOf(r), mat = ch(set, 'grade') === 'W1' ? 'steel-low' : 'stainless-304', n = `${size} mm hose clamp`, band = made(`${n} band`, mat, { tube: [c.ri, c.ri + c.t, c.w] }, { color: STEEL });
    return ch(set, 'housing') === 'yes' ? onto(band, '+x', made(`${n} housing`, mat, { box: [c.hx, c.w + mm(2), c.hz] }, { color: STEEL })) : band; },
  expect: (r, _s, set) => { const c = clampOf(r), yes = ch(set, 'housing') === 'yes', d = rho(ch(set, 'grade') === 'W1' ? 'steel-low' : 'stainless-304');
    return { bound: [2 * (c.ri + c.t) + (yes ? c.hx : 0), yes ? c.w + mm(2) : c.w, Math.max(2 * (c.ri + c.t), yes ? c.hz : 0)], mass: (annV(c.ri, c.ri + c.t, c.w) + (yes ? c.hx * (c.w + mm(2)) * c.hz : 0)) * d, tol: 0.01, massTol: 0.02, says: 'its band open at the range\'s largest (and its housing); nominal mass, the band (and housing) solid' }; },
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['16-25 mm hose clamp band/axis'] } }],
};

// ---- push-in fittings and air tube -------------------------------------------------------------------------------
type PushRow = (typeof PUSHFIT)[string] & { tube: number };
const PUSH_ROWS: Record<string, PushRow> = Object.fromEntries(Object.entries(PUSHFIT).map(([k, v]) => [k, { ...v, tube: Number(k) }]));
const PUSH_TYPES = ['straight', 'union', 'elbow', 'tee'];
/** a push-in fitting's sizes, m: its socket's bore (the tube's outside and 0.1 mm), the body's and the collet's outside, the
 *  stop's bore (0.3 × the tube), how far the tube goes in; its male stud's thread and hex (typical) */
const pushOf = (r: PushRow) => { const g = G_ROWS[r.thread]!; return { ri: mm(r.tube / 2 + 0.1), ro: mm(r.body / 2), rc: mm(r.collet / 2), rs: mm(0.3 * r.tube), dp: mm(r.depth), hc: mm(3), rt: mm(g.d) / 2, et: 0.7 * mm(g.d), af: mm(Math.max(r.body + 2, g.d + 3)), hh: mm(4) }; };
function pushFit(r: PushRow, size: string, set: Record<string, unknown>): Block {
  const k = pushOf(r), type = ch(set, 'type'), n = `${size} mm push-in ${type}`;
  const seg = (nm: string, ri: number, ro: number, L: number, mat = 'pbt'): RunSeg => ({ name: nm, mat, ri, ro, color: mat === 'pom' ? BLACK : PBT, straight: L });
  const end = (i: number): RunSeg[] => [seg(`${n} collet ${i}`, k.ri, k.rc, k.hc, 'pom'), seg(`${n} port ${i}`, k.ri, k.ro, k.dp)];
  if (type === 'straight') return stack(n, 1, [{ b: made(`${n} thread`, 'brass', { tube: [k.rs, k.rt, k.et] }, { color: BRASS }) }, { b: made(`${n} hex`, 'brass', { hex: [k.af, k.hh, k.rs] }, { color: BRASS }) }, { b: made(`${n} port 1`, 'pbt', { tube: [k.ri, k.ro, k.dp] }, { color: PBT }) }, { b: made(`${n} collet 1`, 'pom', { tube: [k.ri, k.rc, k.hc] }, { color: BLACK }) }]);
  if (type === 'union') return run(n, [...end(1), seg(`${n} stop`, k.rs, k.ro, mm(2)), ...end(2).reverse()]);
  if (type === 'elbow') return run(n, [...end(1), { name: `${n} body`, mat: 'pbt', ri: k.rs, ro: k.ro, color: PBT, bend: 90, R: k.ro + mm(0.5) }, ...end(2).reverse()]);
  return branch(run(n, [...end(1), seg(`${n} body`, k.rs, k.ro, 2 * k.ro + mm(1)), ...end(2).reverse()]), `${n} body/axis`, run(`${n} branch`, [seg(`${n} branch body`, k.rs, k.ro, k.ro + mm(0.5)), ...end(3).reverse()]), 0);
}
function pushExpect(r: PushRow, _s: string, set: Record<string, unknown>): Expect {
  const k = pushOf(r), type = ch(set, 'type'), P = rho('pbt'), C = rho('pom'), ends = (m: number) => m * (annV(k.ri, k.ro, k.dp) * P + annV(k.ri, k.rc, k.hc) * C), leg = k.hc + k.dp, cor = (2 * k.af) / Math.sqrt(3), says = 'typical of makers\' pages';
  if (type === 'straight') return { bound: [Math.max(cor, 2 * k.ro), k.et + k.hh + k.dp + k.hc, Math.max(cor, 2 * k.ro)], mass: (annV(k.rs, k.rt, k.et) + hexV(k.af, k.hh, k.rs)) * rho('brass') + ends(1), tol: 0.01, massTol: 0.03, says: `${says}; its stud, hex, socket and collet; nominal mass, each solid` };
  if (type === 'union') return { bound: [2 * k.ro, 2 * leg + mm(2), 2 * k.ro], mass: ends(2) + annV(k.rs, k.ro, mm(2)) * P, tol: 0.01, massTol: 0.03, says: `${says}; its two ends and stop; nominal mass, the tubes` };
  if (type === 'elbow') { const R = k.ro + mm(0.5); return { bound: [R + leg + k.ro, leg + R + k.ro, 2 * k.ro], mass: ends(2) + bendV(k.rs, k.ro, R, 90) * P, tol: 0.01, massTol: 0.03, says: `${says}; its legs and bend; nominal mass, the tubes and bend` }; }
  return { bound: [k.ro + k.ro + mm(0.5) + leg, 2 * leg + 2 * k.ro + mm(1), 2 * k.ro], mass: ends(3) + (annV(k.rs, k.ro, 3 * k.ro + mm(1.5)) - teeCuts(k.rs, k.ro, k.rs)) * P, tol: 0.01, massTol: 0.05, says: `${says}; its run and branch; nominal mass, less what joining the branch takes` };
}
const PUSHFITTING: PartFamily<PushRow> = {
  id: 'piece.pushfit', name: 'Push-in fitting', gloss: 'A push-in pneumatic fitting for 4 to 12 mm air tube: a male stud, a union, an elbow or a tee', domains: ['mechanical', 'pipelines'],
  says: 'A push-in fitting for plastic air tube by the tube\'s outside (4 to 12 mm, typical sizes): a male stud (its thread, hex, socket and collet stacked), or a union, elbow or tee laid as a run of collets, sockets and a body (a branch joined into its side). The tube goes in to the stop along a port\'s axis (`<tube> mm push-in <type> port 1/axis`…). Approximated: its collet\'s teeth and O-ring not drawn, the thread not drawn',
  rows: PUSH_ROWS, size: '6', source: 'typical of push-in fitting makers\' pages (src/nexus/parts/plumbing.ts PUSHFIT)',
  settings: [{ key: 'type', label: 'Type', type: 'choice', default: 'straight', choices: PUSH_TYPES }],
  cannot: (_r, _s, set) => (PUSH_TYPES.includes(ch(set, 'type')) ? null : `a type of ${PUSH_TYPES.join(', ')} (${ch(set, 'type')})`),
  recipe: pushFit, expect: pushExpect,
  tests: [{ inputs: {}, outputs: { pieces: 4 } }, { set: { type: 'tee' }, inputs: {}, outputs: { pieces: 8 } }],
};
const AIRTUBE: PartFamily<[number, number]> = {
  id: 'piece.airtube', name: 'Air tube', gloss: 'A length of pneumatic tube by its outside × bore, 4 × 2.5 to 16 × 12 mm', domains: ['mechanical', 'pipelines'],
  says: 'A straight length of pneumatic tube (polyurethane, nylon or polyethylene) by its outside × bore: it goes into a push-in fitting\'s port along its axis (Through a line) and offers its own',
  rows: AIR_TUBE, size: '6x4', source: 'the sizes sold, as src/nexus/kinds/fluid.ts lists them (src/nexus/parts/plumbing.ts AIR_TUBE)',
  settings: [{ key: 'length', label: 'Length, mm', type: 'number', default: 200 }, { key: 'matter', label: 'Made of', type: 'choice', default: 'pu', choices: ['pu', 'nylon', 'pe'] }],
  cannot: (_t, _s, set) => (len(set) > 0 ? null : `a length above 0 (${String(set.length)} mm)`),
  recipe: ([od, id], size, set) => made(`${size} air tube`, ch(set, 'matter'), { tube: [mm(id / 2), mm(od / 2), len(set)] }, { color: 0x2f80ed }),
  expect: ([od, id], _s, set) => ({ bound: [mm(od), len(set), mm(od)], mass: annV(mm(id / 2), mm(od / 2), len(set)) * rho(ch(set, 'matter')), tol: 0.01, massTol: 0.02, says: 'its outside by its length; nominal mass, the tube' }),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['6x4 air tube/axis'] } }],
};

// ---- PVC-U pipe and solvent fittings; copper tube and capillary fittings ----------------------------------------
type PvcRow = (typeof PVC_PIPE)[string];
const pvcSock = (r: PvcRow): Sock => { const ri = mm(r.od / 2) + 0.00025, ro = ri + mm(r.socketWall); return { ri, ro, depth: mm(0.5 * r.od + 6), bore: mm(r.od / 2 - r.wall), R: ro + mm(1), stop: mm(3), mat: 'pvc', color: PVC }; };
const PVCPIPE: PartFamily<PvcRow> = {
  id: 'piece.pvcpipe', name: 'PVC-U pipe', gloss: 'A length of PVC-U pressure pipe by its DN, DN15 to DN50 (20 to 63 mm outside)', domains: ['mechanical', 'pipelines', 'everyday'],
  says: 'A straight length of PVC-U pressure pipe by its DN (DN15 to DN50: 20, 25, 32, 40, 50 and 63 mm outside; its PN16 wall as commonly listed, typical): it goes into a solvent fitting\'s socket and offers its axis',
  rows: PVC_PIPE, size: 'DN20', source: 'PN16 walls commonly listed for EN 1452-2, typical (src/nexus/parts/plumbing.ts PVC_PIPE)',
  settings: [{ key: 'length', label: 'Length, mm', type: 'number', default: 300 }],
  cannot: (_r, _s, set) => (len(set) > 0 ? null : `a length above 0 (${String(set.length)} mm)`),
  recipe: (r, size, set) => made(`${size} PVC pipe`, 'pvc', { tube: [mm(r.od / 2 - r.wall), mm(r.od / 2), len(set)] }, { color: PVC }),
  expect: (r, _s, set) => ({ bound: [mm(r.od), len(set), mm(r.od)], mass: annV(mm(r.od / 2 - r.wall), mm(r.od / 2), len(set)) * rho('pvc'), tol: 0.01, massTol: 0.02, says: 'its outside by its length; nominal mass, the tube' }),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['DN20 PVC pipe/axis'] } }],
};
const PVCFITTING: PartFamily<PvcRow> = {
  id: 'piece.pvcfitting', name: 'PVC-U solvent fitting', gloss: 'A PVC-U solvent-weld fitting by its DN, DN15 to DN50: elbow 90° or 45°, tee, coupling or cap', domains: ['mechanical', 'pipelines', 'everyday'],
  says: 'A PVC-U solvent-weld fitting by its DN (DN15 to DN50): an elbow, tee or coupling laid as a run of its sockets and body (a tee\'s branch joined into its side), or a cap. Each socket as deep as 0.5 × the pipe\'s outside + 6 mm (the ISO 727 rule, as recalled: typical), its bore the pipe\'s outside and 0.25 mm; it offers each socket\'s axis (`<DN> PVC <type> port 1/axis`…), for a pipe along it',
  rows: PVC_PIPE, size: 'DN20', source: 'typical: EN 1452-3 / ISO 727 socket rule as recalled, makers\' proportions (src/nexus/parts/plumbing.ts PVC_PIPE)',
  settings: [{ key: 'type', label: 'Type', type: 'choice', default: 'elbow 90', choices: SOCK_TYPES }],
  cannot: (_r, _s, set) => (SOCK_TYPES.includes(ch(set, 'type')) ? null : `a type of ${SOCK_TYPES.join(', ')} (${ch(set, 'type')})`),
  recipe: (r, size, set) => sockFitting(`${size} PVC ${ch(set, 'type')}`, pvcSock(r), ch(set, 'type')),
  expect: (r, _s, set) => sockExpect(pvcSock(r), ch(set, 'type'), 'typical'),
  tests: [{ inputs: {}, outputs: { pieces: 3, offers: ['DN20 PVC elbow 90 port 1/axis', 'DN20 PVC elbow 90 port 2/axis'] } }],
};
type CuRow = { od: number; t: number };
const CU_ROWS: Record<string, CuRow> = Object.fromEntries(Object.entries(EN1057).flatMap(([od, ts]) => ts.map((t) => [`${od}×${t}`, { od: Number(od), t }])));
const CUTUBE: PartFamily<CuRow> = {
  id: 'piece.cutube', name: 'Copper tube (EN 1057)', gloss: 'A length of copper tube by its EN 1057 outside and wall, 6 to 54 mm', domains: ['mechanical', 'pipelines', 'everyday'],
  says: 'A straight length of copper tube by its EN 1057 outside × wall (6 to 54 mm): it goes into a capillary fitting\'s socket and offers its axis',
  rows: CU_ROWS, size: '15×0.7', source: 'EN 1057 outsides and walls, as src/nexus/kinds/fluid.ts holds them (src/nexus/parts/plumbing.ts EN1057)',
  settings: [{ key: 'length', label: 'Length, mm', type: 'number', default: 300 }],
  cannot: (_r, _s, set) => (len(set) > 0 ? null : `a length above 0 (${String(set.length)} mm)`),
  recipe: (r, size, set) => made(`copper ${size} tube`, 'copper', { tube: [mm(r.od / 2 - r.t), mm(r.od / 2), len(set)] }, { color: COPPER }),
  expect: (r, _s, set) => ({ bound: [mm(r.od), len(set), mm(r.od)], mass: annV(mm(r.od / 2 - r.t), mm(r.od / 2), len(set)) * rho('copper'), tol: 0.01, massTol: 0.02, says: 'its outside by its length; nominal mass, the tube' }),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['copper 15×0.7 tube/axis'] } }],
};
type CuFitRow = (typeof CU_FITTING)[number] & { od: number };
const CUFIT_ROWS: Record<string, CuFitRow> = Object.fromEntries(Object.entries(CU_FITTING).map(([od, f]) => [od, { ...f, od: Number(od) }]));
const cuSock = (r: CuFitRow): Sock => { const ri = mm(r.od / 2) + 0.00025, ro = ri + mm(r.wall); return { ri, ro, depth: mm(r.socket), bore: mm(r.od / 2 - EN1057[r.od]![0]!), R: mm(r.R), stop: mm(2), mat: 'copper', color: COPPER }; };
const CUFITTING: PartFamily<CuFitRow> = {
  id: 'piece.cufitting', name: 'Copper capillary fitting', gloss: 'A copper end-feed fitting for EN 1057 tube, 15 to 54 mm: elbow 90° or 45°, tee, coupling or stop end', domains: ['mechanical', 'pipelines', 'everyday'],
  says: 'A copper capillary (end-feed) fitting after EN 1254-1 for EN 1057 tube (15 to 54 mm; its sockets, walls and bend radii typical of makers\' tables): an elbow, tee or coupling laid as a run of its sockets and body (a tee\'s branch joined into its side), or a stop end. Each socket\'s bore the tube\'s outside and 0.25 mm; it offers each socket\'s axis (`<od> copper <type> port 1/axis`…)',
  rows: CUFIT_ROWS, size: '15', source: 'typical of EN 1254-1 capillary fittings, makers\' tables (src/nexus/parts/plumbing.ts CU_FITTING); EN 1057 tube',
  settings: [{ key: 'type', label: 'Type', type: 'choice', default: 'elbow 90', choices: SOCK_TYPES }],
  cannot: (_r, _s, set) => (SOCK_TYPES.includes(ch(set, 'type')) ? null : `a type of ${SOCK_TYPES.join(', ')} (${ch(set, 'type')})`),
  recipe: (r, size, set) => sockFitting(`${size} copper ${ch(set, 'type')}`, cuSock(r), ch(set, 'type')),
  expect: (r, _s, set) => sockExpect(cuSock(r), ch(set, 'type'), 'typical'),
  tests: [{ inputs: {}, outputs: { pieces: 3, offers: ['15 copper elbow 90 port 1/axis', '15 copper elbow 90 port 2/axis'] } }],
};

// ---- flanges -----------------------------------------------------------------------------------------------------
type EnRow = (typeof EN1092_PN6)[string];
const FLANGE: PartFamily<EnRow> = {
  id: 'piece.flange', name: 'Pipe flange (EN 1092-1 PN6)', gloss: 'A plate (type 01) or blind (type 05) flange to EN 1092-1 PN6, DN15 to DN2000', domains: ['mechanical', 'pipelines', 'structural'],
  says: 'A steel pipe flange to EN 1092-1 PN6 by its DN: a plate flange (type 01), its bore for the pipe, or a blind (type 05), each with its bolt holes on their circle. It offers its axis (`<DN> PN6 plate flange/axis`, for a pipe through it) and its holes (`…/holes`, for a bolted joint through two stacked with a gasket between). Its raised face, if any, not drawn',
  rows: EN1092_PN6, size: 'DN50', source: 'EN 1092-1 PN6 as BOLTS gives it (flanges.blt, MIT) (src/nexus/parts/plumbing.ts EN1092_PN6)',
  settings: [{ key: 'type', label: 'Type', type: 'choice', default: 'plate', choices: ['plate', 'blind'] }],
  recipe: ([d1, k, D, b1, b5, d2, n], size, set) => { const blind = ch(set, 'type') === 'blind', holes = { pattern: { name: 'holes', circle: { n, r: mm(k / 2) }, hole: mm(d2 / 2) }, color: STEEL };
    return blind ? made(`${size} PN6 blind flange`, 'steel-low', { cyl: [mm(D / 2), mm(b5)] }, holes) : made(`${size} PN6 plate flange`, 'steel-low', { tube: [mm(d1 / 2), mm(D / 2), mm(b1)] }, holes); },
  expect: ([d1, , D, b1, b5, d2, n], _s, set) => { const blind = ch(set, 'type') === 'blind', b = mm(blind ? b5 : b1);
    return { bound: [mm(D), b, mm(D)], mass: (Math.PI * mm(D / 2) ** 2 - (blind ? 0 : Math.PI * mm(d1 / 2) ** 2) - n * Math.PI * mm(d2 / 2) ** 2) * b * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its outside and thickness; nominal mass, the plate less its bore and holes' }; },
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['DN50 PN6 plate flange/axis', 'DN50 PN6 plate flange/holes'] } }],
};
const GASKET: PartFamily<EnRow> = {
  id: 'piece.flangegasket', name: 'Flange gasket', gloss: 'A flat gasket for an EN 1092-1 PN6 flange, inside its bolt circle, DN15 to DN2000', domains: ['mechanical', 'pipelines'],
  says: 'A flat gasket for an EN 1092-1 PN6 flange (2 mm EPDM, typical), its bore the flange\'s, its outside within the bolt holes so the bolts pass outside it: it goes between two flanges in a stack',
  rows: EN1092_PN6, size: 'DN50', source: 'EN 1092-1 PN6 as BOLTS gives it (flanges.blt, MIT); its thickness typical (src/nexus/parts/plumbing.ts)',
  recipe: ([d1, k, , , , d2], size) => made(`${size} PN6 gasket`, 'epdm', { tube: [mm(d1 / 2), mm(k / 2 - d2 / 2 - 1), mm(2)] }, { color: BLACK }),
  expect: ([d1, k, , , , d2]) => ({ bound: [mm(k - d2 - 2), mm(2), mm(k - d2 - 2)], mass: annV(mm(d1 / 2), mm(k / 2 - d2 / 2 - 1), mm(2)) * rho('epdm'), tol: 0.01, massTol: 0.02, says: 'its outside and thickness; nominal mass, the ring' }),
  tests: [{ inputs: {}, outputs: { pieces: 1 } }],
};
type AsmeFl = (typeof ASME_FLANGE)[string];
const ASMEFLANGE: PartFamily<AsmeFl> = {
  id: 'piece.asmeflange', name: 'Pipe flange (ASME B16.5)', gloss: 'A slip-on or blind flange to ASME B16.5, classes 150 and 300, NPS 1/2 to 24', domains: ['mechanical', 'pipelines', 'structural'],
  says: 'A steel pipe flange to ASME B16.5 by its NPS and class (150 or 300): a slip-on (its plate with the bolt holes and its hub stacked, its bore for the pipe) or a blind. It offers its axis (`NPS <size> class <c> slip-on flange/axis`, for a pipe through it) and its holes (`…/holes`, for a bolted joint). Its raised face not drawn',
  rows: ASME_FLANGE, size: '2', source: 'ASME B16.5 Tables 7 to 10 as bd_warehouse gives them (flange.py, Apache-2.0) (src/nexus/parts/plumbing.ts ASME_FLANGE)',
  settings: [{ key: 'class', label: 'Class', type: 'choice', default: '150', choices: ['150', '300'] }, { key: 'type', label: 'Type', type: 'choice', default: 'slip-on', choices: ['slip-on', 'blind'] }],
  recipe: (r, size, set) => { const [O, tf, X, Y, B, W, h, n] = ch(set, 'class') === '300' ? r.c300 : r.c150, blind = ch(set, 'type') === 'blind', nm = `NPS ${size} class ${ch(set, 'class')} ${blind ? 'blind' : 'slip-on'} flange`;
    const holes = { pattern: { name: 'holes', circle: { n, r: mm(W / 2) }, hole: mm(h / 2) }, color: STEEL };
    if (blind) return made(nm, 'steel-low', { cyl: [mm(O / 2), mm(tf)] }, holes);
    return stack(nm, 1, [{ b: made(nm, 'steel-low', { tube: [mm(B / 2), mm(O / 2), mm(tf)] }, holes) }, { b: made(`${nm} hub`, 'steel-low', { tube: [mm(B / 2), mm(X / 2), mm(Y - tf)] }, { color: STEEL }) }]); },
  expect: (r, _s, set) => { const [O, tf, X, Y, B, , h, n] = ch(set, 'class') === '300' ? r.c300 : r.c150, blind = ch(set, 'type') === 'blind', d = rho('steel-low'), holes = n * Math.PI * mm(h / 2) ** 2 * mm(tf);
    return blind ? { bound: [mm(O), mm(tf), mm(O)], mass: (Math.PI * mm(O / 2) ** 2 * mm(tf) - holes) * d, tol: 0.01, massTol: 0.02, says: 'its outside and thickness; nominal mass, the plate less its holes' }
      : { bound: [mm(O), mm(Y), mm(O)], mass: (annV(mm(B / 2), mm(O / 2), mm(tf)) + annV(mm(B / 2), mm(X / 2), mm(Y - tf)) - holes) * d, tol: 0.01, massTol: 0.02, says: 'its outside and its length through the hub; nominal mass, plate and hub less its bore and holes' }; },
  tests: [{ inputs: {}, outputs: { pieces: 2, offers: ['NPS 2 class 150 slip-on flange hub/axis', 'NPS 2 class 150 slip-on flange/axis', 'NPS 2 class 150 slip-on flange/holes'] } }],
};

// ---- tanks -------------------------------------------------------------------------------------------------------
type TankRow = (typeof TANKS)[string];
/** a tank's two side ports on its +x face, in its height (y) and depth (z): one low, one high, each its port's
 *  diameter and a wall's thickness clear of the floor and the rim */
const portsOf = ([, h, , t]: TankRow, d: number): [number, number][] => [[mm(-h / 2 + t) + 1.5 * d, 0], [mm(h / 2) - 2 * d, 0]];
const TANK: PartFamily<TankRow> = {
  id: 'piece.tank', name: 'Tank', gloss: 'A rectangular tank, open at the top, by its capacity, 10 L to 1000 L, with two ports in its side', domains: ['mechanical', 'pipelines', 'everyday'],
  says: 'A rectangular rotomoulded polyethylene tank, open at the top, by its capacity (10 to 1000 L, typical sizes): its cavity offered as a room (`<size> tank/cavity`, for a pump or a float into it) and two ports bored through its +x wall, low and high (`<size> tank/ports`, along the wall\'s normal, for a pipe through it). The port\'s bore is a setting (mm); a lid is mate.lid',
  rows: TANKS, size: '10 L', source: 'typical rotomoulded tanks (src/nexus/parts/plumbing.ts TANKS)',
  settings: [{ key: 'port', label: 'Port bore, mm', type: 'number', default: 22 }],
  cannot: ([, h, d, t], _s, set) => { const p = Number(set.port); return !(p > 0) ? `a port above 0 mm (${String(set.port)})` : 4 * p > h - 2 * t || p > d - 4 * t ? `a port of ${p} mm does not fit its wall (${h} × ${d} mm)` : null; },
  recipe: (r, size, set) => { const [w, h, d, t] = r, p = mm(Number(set.port));
    return made(`${size} tank`, 'pe', { case: [mm(w), mm(h), mm(d), mm(t), mm(t)] }, { color: 0x3c7d4a, pattern: { name: 'ports', points: portsOf(r, p), hole: p / 2, face: '+x', depth: mm(t) } }); },
  expect: ([w, h, d, t], _s, set) => { const p = mm(Number(set.port)), [W, H, D, T] = [w, h, d, t].map(mm) as [number, number, number, number];
    return { bound: [W, H, D], mass: (W * H * D - (W - 2 * T) * (H - T) * (D - 2 * T) - 2 * Math.PI * (p / 2) ** 2 * T) * rho('pe'), tol: 0.01, massTol: 0.02, says: 'its outside; nominal mass, its walls and floor less its two ports' }; },
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['10 L tank/cavity', '10 L tank/ports'] } }],
};

/** Every plumbing family the maker makes (registered in src/nexus/parts/index.ts). */
export const PLUMBING = [GFITTING, BALLVALVE, CHECKVALVE, NEEDLEVALVE, HOSEBARB, HOSE, HOSECLAMP, PUSHFITTING, AIRTUBE, PVCPIPE, PVCFITTING, CUTUBE, CUFITTING, FLANGE, GASKET, ASMEFLANGE, TANK] as PartFamily<unknown>[];
