// Fixings and rigging made by the table-driven maker (decision 0026, the user's 2026-11-06 "add 1000 new working
// parts"): inch fasteners (UNC and UNF hex cap screws and hex, jam, thick and square nuts, socket head cap screws, set
// screws, button, pan and fillister head screws, SAE, USS and lock washers), self-tapping screws (ISO 7049, 7050, 1481,
// 1479), studs (DIN 938, 939, 835), eye bolts and eye nuts (DIN 580, 582), U-bolts (DIN 3570), shackles, short-link chain
// (DIN 766), E-clips (DIN 6799), R-clips (DIN 11024), knurled thumb screws (DIN 464, 653), wing screws (DIN 316),
// self-clinching nuts and studs, turnbuckles, wire rope clips, strap hinges and 35 mm cup hinges. Each a table of rows
// and one recipe of the room operations (src/nexus/room.ts): no place is written here, every place is what an
// operation gives. Threads are never drawn: a shank or a nut's bore is drawn at the thread's major diameter, so a UNC
// and a UNF row of one size draw alike (each is its own part, its pitch in its name).
//
// Copied from BOSL2 (https://github.com/BelfrySCAD/BOSL2, screws.scad, read as text 2026-11-06, never run), its
// tables of English (UTS) screws and nuts: UTS_thread (threads per inch, UNC and UNF), UTS_hex (hex heads, flats and
// height), UTS_button, UTS_pan (its Phillips head height), UTS_fillister, and the nut rule of _nut_info_english (ASME
// B18.2.2: its table for #0 to 1/4 and its rule above). Changes: written as TypeScript rows, inches as BOSL2 gives
// them; the 1/4 jam and thick nut's width taken as its hex nut's 7/16 (BOSL2's rule gives 3/8, which B18.2.2 does not
// give). Its notice:
//
//     BSD 2-Clause License
//
//     Copyright (c) 2017-2019, Revar Desmera
//     All rights reserved.
//
//     Redistribution and use in source and binary forms, with or without
//     modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright notice, this
//       list of conditions and the following disclaimer.
//
//     * Redistributions in binary form must reproduce the above copyright notice,
//       this list of conditions and the following disclaimer in the documentation
//       and/or other materials provided with the distribution.
//
//     THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
//     AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
//     IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
//     DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
//     FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
//     DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
//     SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
//     CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
//     OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
//     OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
// Copied from bd_warehouse (https://github.com/gumyr/bd_warehouse, src/bd_warehouse/data, read 2026-11-06): the
// asme_b18.3 columns of socket_head_cap_parameters.csv (dk, k, s, t) and imperial_set_screw_parameters.csv (socket size
// and depth), their lines kept as the CSV gives them. Its notice:
//
//     Copyright 2024 Gumyr
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
// The rest are not copied: written from recall of makers' tables of each standard, read from no source here and so
// labelled typical (FIXINGS_SOURCES says which, table by table; FIXINGS_STATUS what each is). None was cross-checked
// against the copyleft tables (FreeCAD Fasteners, BOLTS): left open.

import { made, over, run, stack, turn, ring, type Block } from '../room';
import { METRIC, nut as isoNut } from '../common';
import { densityKg } from '../mass';
import { familyNode, type PartFamily } from './maker';
import type { BlockDef } from '../blocks';

// ---- helpers -----------------------------------------------------------------------------------------------------
const IN = 0.0254;
const inch = (x: number): number => x * IN;
const mm = (x: number): number => x / 1000;
const rho = (mat: string): number => { const d = densityKg(mat); if (d === undefined) throw new Error(`no density for ${mat}`); return d; };
const disc = (d: number) => (Math.PI * d * d) / 4;
const annulus = (D: number, d: number) => disc(D) - disc(d);
const hexA = (s: number) => (Math.sqrt(3) / 2) * s * s;
const corners = (s: number) => (2 * s) / Math.sqrt(3);
const frustum = (r1: number, r2: number, h: number) => (Math.PI * h * (r1 * r1 + r1 * r2 + r2 * r2)) / 3;
const turnedVol = (pts: [number, number][]) => Math.abs(pts.reduce((v, p, i) => { const q = pts[(i + 1) % pts.length]!; return v + (Math.PI / 3) * (p[0] ** 2 + p[0] * q[0] + q[0] ** 2) * (q[1] - p[1]); }, 0));
/** A spherical cap's outline, its base a across (radius) and k high, as (radius, height) points from its base's middle. */
const capPts = (a: number, k: number, n = 12): [number, number][] => { const R = (a * a + k * k) / (2 * k), f0 = Math.asin(Math.min(1, a / R));
  return [[0, 0], ...Array.from({ length: n + 1 }, (_, i) => { const f = f0 * (1 - i / n); return [R * Math.sin(f), Math.max(0, k - R + R * Math.cos(f))] as [number, number]; })]; };
/** A pan head's outline (approximated), radius a, height k. */
const panPts = (a: number, k: number): [number, number][] => [[0, 0], [a, 0], [a, 0.55 * k], [0.85 * a, 0.85 * k], [0.55 * a, k], [0, k]];
/** A tube's length of a torus: its mean radius R and its section's radius r. */
const torusVol = (R: number, r: number) => 2 * Math.PI ** 2 * R * r * r;
/** "5/64", "1 1/8", "0.050": inches as a number. */
const frac = (s: string): number => { const t = s.trim(); if (/^\d+ \d+\/\d+$/.test(t)) { const [w, f] = t.split(' '); return Number(w) + frac(f!); } if (t.includes('/')) { const [a, b] = t.split('/'); return Number(a) / Number(b); } return Number(t); };
const len = (set: Record<string, unknown>, k = 'length') => Number(set[k]) / 1000;
const lenIn = (set: Record<string, unknown>, k = 'length') => inch(Number(set[k]));
const above0 = (set: Record<string, unknown>, k: string, what: string, unit = 'mm') => (Number(set[k]) > 0 && Number.isFinite(Number(set[k])) ? null : `${what} above 0 (${String(set[k])} ${unit})`);
const n3 = (v: number) => +v.toFixed(3);
const T = (pieces: number, more: Record<string, unknown> = {}, set?: Record<string, unknown>) => ({ ...(set ? { set } : {}), inputs: {}, outputs: { pieces, ...more } });
const FAST = ['mechanical', 'manufacturing', 'everyday'];
const RIG = ['mechanical', 'structural', 'manufacturing'];
const ZINC = 0xa9acb0, DARK = 0x2a2b2e, BRIGHT = 0xc8ccd0;
const STEEL = 'steel-low', ALLOY = 'steel-alloy';

// ---- the inch tables, copied from BOSL2 (screws.scad) ---------------------------------------------------------------
/** Nominal UTS sizes and their major diameter (in): "#N" is 0.060 + 0.013 N (BOSL2's rule), the rest their fraction. */
export const UTS_NOMINAL: Record<string, number> = Object.fromEntries([...[0, 1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => [`#${n}`, n3(0.06 + 0.013 * n)] as [string, number]),
  ...['1/4', '5/16', '3/8', '7/16', '1/2', '9/16', '5/8', '3/4', '7/8', '1', '1 1/8', '1 1/4', '1 3/8', '1 1/2', '1 3/4', '2'].map((k) => [k, frac(k)] as [string, number])]);
/** Threads per inch by size, [UNC, UNF] (0: none), BOSL2's UTS_thread. */
export const UTS_THREAD: Record<string, [number, number]> = {
  '#0': [0, 80], '#1': [64, 72], '#2': [56, 64], '#3': [48, 56], '#4': [40, 48], '#5': [40, 44], '#6': [32, 40], '#8': [32, 36], '#10': [24, 32], '#12': [24, 28],
  '1/4': [20, 28], '5/16': [18, 24], '3/8': [16, 24], '7/16': [14, 20], '1/2': [13, 20], '9/16': [12, 18], '5/8': [11, 18], '3/4': [10, 16], '7/8': [9, 14], '1': [8, 12],
  '1 1/8': [7, 12], '1 1/4': [7, 12], '1 3/8': [6, 12], '1 1/2': [6, 12], '1 3/4': [5, 0], '2': [4.5, 0],
};
/** Hex heads (in): across flats and height, BOSL2's UTS_hex (ASME B18.2.1 hex cap screws; #2 to #12 its small hex heads). */
export const UTS_HEX: Record<string, [number, number]> = {
  '#2': [1 / 8, 1 / 16], '#4': [3 / 16, 1 / 16], '#6': [1 / 4, 3 / 32], '#8': [1 / 4, 7 / 64], '#10': [5 / 16, 1 / 8], '#12': [5 / 16, 5 / 32], '1/4': [7 / 16, 5 / 32], '5/16': [1 / 2, 13 / 64],
  '3/8': [9 / 16, 1 / 4], '7/16': [5 / 8, 19 / 64], '1/2': [3 / 4, 11 / 32], '9/16': [13 / 16, 23 / 64], '5/8': [15 / 16, 27 / 64], '3/4': [1.125, 1 / 2], '7/8': [1 + 5 / 16, 37 / 64],
  '1': [1.5, 43 / 64], '1 1/8': [1 + 11 / 16, 11 / 16], '1 1/4': [1 + 7 / 8, 27 / 32], '1 1/2': [2.25, 15 / 16], '1 3/4': [2 + 5 / 8, 1 + 3 / 32], '2': [3, 1 + 7 / 32],
};
/** Button heads (in): head diameter, height, hex key, hex depth, BOSL2's UTS_button (ASME B18.3). */
export const UTS_BUTTON: Record<string, [number, number, number, number]> = {
  '#0': [0.114, 0.032, 0.035, 0.02], '#1': [0.139, 0.039, 3 / 64, 0.028], '#2': [0.164, 0.046, 3 / 64, 0.028], '#3': [0.188, 0.052, 1 / 16, 0.035], '#4': [0.213, 0.059, 1 / 16, 0.035],
  '#5': [0.238, 0.066, 5 / 64, 0.044], '#6': [0.262, 0.073, 5 / 64, 0.044], '#8': [0.312, 0.087, 3 / 32, 0.052], '#10': [0.361, 0.101, 1 / 8, 0.07], '#12': [0.413, 0.114, 1 / 8, 0.07],
  '1/4': [0.437, 0.132, 5 / 32, 0.087], '5/16': [0.547, 0.166, 3 / 16, 0.105], '3/8': [0.656, 0.199, 7 / 32, 0.122], '7/16': [0.75, 0.22, 1 / 4, 0.193], '1/2': [0.875, 0.265, 5 / 16, 0.175],
  '5/8': [1, 0.331, 3 / 8, 0.21], '3/4': [1.1, 0.375, 7 / 16, 0.241],
};
/** Pan heads (in): head diameter and its Phillips head's height, BOSL2's UTS_pan (ASME B18.6.3). */
export const UTS_PAN: Record<string, [number, number]> = {
  '#0': [0.116, 0.044], '#1': [0.142, 0.053], '#2': [0.167, 0.063], '#3': [0.193, 0.071], '#4': [0.219, 0.08], '#5': [0.245, 0.089], '#6': [0.27, 0.097], '#8': [0.322, 0.115],
  '#10': [0.373, 0.133], '#12': [0.425, 0.151], '1/4': [0.492, 0.175], '5/16': [0.615, 0.218], '3/8': [0.74, 0.261],
};
/** Fillister heads (in): head diameter and height, BOSL2's UTS_fillister (ASME B18.6.3). */
export const UTS_FILLISTER: Record<string, [number, number]> = {
  '#0': [0.096, 0.055], '#1': [0.118, 0.069], '#2': [0.14, 0.083], '#3': [0.161, 0.095], '#4': [0.183, 0.107], '#5': [0.205, 0.12], '#6': [0.226, 0.132], '#8': [0.27, 0.156],
  '#10': [0.313, 0.18], '#12': [0.357, 0.205], '1/4': [0.414, 0.237], '5/16': [0.518, 0.295], '3/8': [0.622, 0.355],
};
/** Hex nuts #0 to 1/4 (in): thickness and width across flats, BOSL2's normal table (ASME B18.2.2 Table A-1). */
export const UTS_NUT_SMALL: Record<string, [number, number]> = {
  '#0': [3 / 64, 5 / 32], '#1': [3 / 64, 5 / 32], '#2': [1 / 16, 3 / 16], '#3': [1 / 16, 3 / 16], '#4': [3 / 32, 1 / 4], '#5': [7 / 64, 5 / 16], '#6': [7 / 64, 5 / 16], '#8': [1 / 8, 11 / 32],
  '#10': [1 / 8, 3 / 8], '#12': [5 / 32, 7 / 16], '1/4': [7 / 32, 7 / 16],
};
/** Hex jam (thin) and thick nuts (in): their thickness where BOSL2's table gives it; the rest by its rule. */
export const UTS_NUT_THIN: Record<string, number> = { '1/4': 5 / 32, '5/16': 3 / 16, '3/8': 7 / 32, '7/16': 1 / 4, '1/2': 5 / 16, '9/16': 5 / 16, '5/8': 3 / 8 };
export const UTS_NUT_THICK: Record<string, number> = { '1/4': 9 / 32, '5/16': 21 / 64, '3/8': 13 / 32, '7/16': 29 / 64, '1/2': 9 / 16, '9/16': 39 / 64, '5/8': 23 / 32, '3/4': 13 / 16, '7/8': 29 / 32, '1': 1, '1 1/8': 1 + 5 / 32, '1 1/4': 1.25, '1 3/8': 1.375, '1 1/2': 1.5 };
const qdn = (x: number, q: number) => Math.floor(x / q + 1e-9) * q, qup = (x: number, q: number) => Math.ceil(x / q - 1e-9) * q;
/** A UTS nut's thickness and width (in), as BOSL2's _nut_info_english works it (B18.2.2), by its kind. */
function utsNut(nom: string, kind: 'hex' | 'jam' | 'thick' | 'square'): { m: number; s: number } {
  const d = UTS_NOMINAL[nom]!, small = UTS_NUT_SMALL[nom];
  const hexW = small ? small[1] : qup(1.5 * d, 1 / 16);
  if (kind === 'square') return small ? { m: small[0], s: small[1] } : { m: Math.abs(d - 1.125) < 1e-9 ? 1 : qdn((7 / 8) * d, 1 / 64), s: d < 5 / 8 ? qup(1.5 * d, 1 / 16) + 1 / 16 : 1.5 * d };
  if (kind === 'jam') return { m: UTS_NUT_THIN[nom] ?? (d < 1 + 3 / 16 ? qdn(0.5 * d + 3 / 64, 1 / 64) : 0.5 * d + 3 / 32), s: hexW };
  if (kind === 'thick') return { m: UTS_NUT_THICK[nom]!, s: hexW };
  return { m: small ? small[0] : d < 11 / 16 ? qdn((7 / 8) * d, 1 / 64) : d < 1 + 3 / 16 ? (7 / 8) * d - 1 / 64 : (7 / 8) * d - 1 / 32, s: hexW };
}
/** Socket head cap screws, ASME B18.3, as bd_warehouse gives them (socket_head_cap_parameters.csv, its asme_b18.3
 *  columns: size, dk, k, s, t, in). */
export const B183_SOURCE = `#0-80,0.096,0.0600,0.050,0.025;#1-64,0.118,0.0730,1/16,0.031;#1-72,0.118,0.0730,1/16,0.031;#2-56,0.140,0.0860,5/64,0.038;#2-64,0.140,0.0860,5/64,0.038;#3-48,0.161,0.0990,5/64,0.044;#3-56,0.161,0.0990,5/64,0.044;#4-36,0.183,0.1120,3/32,0.051;#4-40,0.183,0.1120,3/32,0.051;#4-48,0.183,0.1120,3/32,0.051;#5-40,0.205,0.1250,3/32,0.057;#5-44,0.205,0.1250,3/32,0.057;#6-32,0.226,0.1380,7/64,0.064;#6-40,0.226,0.1380,7/64,0.064;#8-32,0.270,0.1640,9/64,0.077;#8-36,0.270,0.1640,9/64,0.077;#10-24,0.312,0.1900,5/32,0.090;#10-32,0.312,0.1900,5/32,0.090;1/4-20,0.375,0.2500,3/16,0.120;1/4-28,0.375,0.2500,3/16,0.120;5/16-18,0.469,0.3125,1/4,0.151;5/16-24,0.469,0.3125,1/4,0.151;3/8-16,0.562,0.3750,5/16,0.182;3/8-24,0.562,0.3750,5/16,0.182;7/16-14,0.656,0.4375,3/8,0.213;7/16-20,0.656,0.4375,3/8,0.213;1/2-13,0.750,0.5000,3/8,0.245;1/2-20,0.750,0.5000,3/8,0.245;5/8-11,0.938,0.6250,1/2,0.307;5/8-18,0.938,0.6250,1/2,0.307;3/4-10,1.125,0.7500,5/8,0.370;3/4-16,1.125,0.7500,5/8,0.370;7/8-14,1.312,0.8750,3/4,0.432;7/8-9,1.312,0.8750,3/4,0.432;1-8,1.500,1.0000,3/4,0.495;1-12,1.500,1.0000,3/4,0.495;1-14,1.500,1.0000,3/4,0.495`;
/** Inch hex socket set screws, as bd_warehouse gives them (imperial_set_screw_parameters.csv: size, socket, depth, in). */
export const SETSCREW_SOURCE = `#0-80,0.028,0.05;#1-64,0.028,0.06;#1-72,0.028,0.06;#2-56,0.035,0.06;#2-64,0.035,0.06;#3-48,0.05,0.07;#3-56,0.05,0.07;#4-36,0.05,0.07;#4-40,0.05,0.07;#4-48,0.05,0.07;#5-40,1/16,0.08;#5-44,1/16,0.08;#6-32,1/16,0.08;#6-40,1/16,0.08;#8-32,5/64,0.09;#8-36,5/64,0.09;#10-24,3/32,0.1;#10-32,3/32,0.1;1/4-20,1/8,0.125;1/4-28,1/8,0.125;5/16-18,5/32,0.156;5/16-24,5/32,0.156;3/8-16,3/16,0.188;3/8-24,3/16,0.188;7/16-14,7/32,0.219;7/16-20,7/32,0.219;1/2-13,1/4,0.25;1/2-20,1/4,0.25;5/8-11,5/16,0.312;5/8-18,5/16,0.312;3/4-10,3/8,0.375;3/4-16,3/8,0.375;7/8-14,1/2,0.5;7/8-9,1/2,0.5;1-8,9/16,0.562;1-12,9/16,0.562;1-14,9/16,0.562`;
const csvRows = (src: string): string[][] => src.split(';').map((l) => l.split(','));
/** A UTS row's size and thread: its nominal, major diameter (in), threads per inch and series. */
type Uts = { nom: string; d: number; tpi: number; series: string };
const utsOf = (key: string): Uts => { const i = key.lastIndexOf('-'), nom = key.slice(0, i), tpi = Number(key.slice(i + 1)), t = UTS_THREAD[nom];
  return { nom, d: UTS_NOMINAL[nom]!, tpi, series: t?.[0] === tpi ? 'UNC' : t?.[1] === tpi ? 'UNF' : 'UNS' }; };
/** Every UNC and UNF row of the sizes a head table has: "1/4-20", "1/4-28". */
function utsRows<H>(heads: Record<string, H>): Record<string, Uts & { h: H }> {
  return Object.fromEntries(Object.entries(heads).flatMap(([nom, h]) => (UTS_THREAD[nom] ?? [0, 0]).filter((t) => t > 0).map((tpi) => { const k = `${nom}-${tpi}`; return [k, { ...utsOf(k), h }]; })));
}
const said = (u: Uts) => `${u.nom}-${u.tpi} ${u.series}`;
const INCH_LEN = (d: number) => [{ key: 'length', label: 'Length under the head, in', type: 'number' as const, default: d }];

// ---- inch screws -------------------------------------------------------------------------------------------------
const INCHBOLT: PartFamily<Uts & { h: [number, number] }> = {
  id: 'piece.inchbolt', name: 'Hex cap screw (inch)', gloss: 'A UNC or UNF hex cap screw (ASME B18.2.1) by its thread and length', domains: FAST, aisle: 'Fasteners / Inch bolts and screws',
  says: 'A hex cap screw by its UTS thread ("1/4-20", UNC or UNF) and its length under the head (in): its shank at the thread\'s major diameter (the thread not drawn: a UNC and a UNF row draw alike) and its hex head on top (ASME B18.2.1, BOSL2\'s table; #2 to #12 its small hex heads). Its shank offers its axis (`<name> shank/axis`): a washer and a nut slide over it (Over a shaft), it passes through a hole (Through a line)',
  rows: utsRows(UTS_HEX), size: '1/4-20', source: 'ASME B18.2.1 heads and UTS threads as BOSL2 gives them (screws.scad, BSD-2, copied here)',
  settings: INCH_LEN(1),
  cannot: (_q, _s, set) => above0(set, 'length', 'a length', 'in'),
  recipe: (q, size, set) => stack(`${size} × ${Number(set.length)} in hex cap screw`, 1, [{ b: made(`${size} shank`, ALLOY, { cyl: [inch(q.d) / 2, lenIn(set)] }, { color: ZINC }) }, { b: made(`${size} head`, ALLOY, { hex: [inch(q.h[0]), inch(q.h[1])] }, { color: ZINC }) }]),
  expect: (q, _s, set) => { const W = corners(inch(q.h[0])), L = lenIn(set), H = inch(q.h[1]); return { bound: [W, L + H, W], mass: (disc(inch(q.d)) * L + hexA(inch(q.h[0])) * H) * rho(ALLOY), tol: 0.01, massTol: 0.02, says: `${said(q)}: its head across corners by its length and head; nominal mass, shank and head solid` }; },
  tests: [T(2, { offers: ['1/4-20 head/axis', '1/4-20 shank/axis'] }), T(2, {}, { size: '2-4.5', length: 6 })],
};
type B183 = Uts & { dk: number; k: number; s: number; t: number };
const SHCS_ROWS: Record<string, B183> = Object.fromEntries(csvRows(B183_SOURCE).map(([k, dk, kk, s, t]) => [k!, { ...utsOf(k!), dk: frac(dk!), k: frac(kk!), s: frac(s!), t: frac(t!) }]));
const INCHSHCS: PartFamily<B183> = {
  id: 'piece.inchshcs', name: 'Socket head cap screw (inch)', gloss: 'A UTS socket head cap screw (ASME B18.3) by its thread and length', domains: FAST, aisle: 'Fasteners / Inch bolts and screws',
  says: 'A socket head cap screw by its UTS thread ("#10-32", "1/4-20") and its length under the head (in): its shank and its round head (ASME B18.3, bd_warehouse\'s table), its hex socket drawn round (`<name> head/socket`). Its shank offers its axis; it goes down a counterbored hole (Through a line)',
  rows: SHCS_ROWS, size: '1/4-20', source: 'ASME B18.3 as bd_warehouse gives it (socket_head_cap_parameters.csv, Apache-2.0, copied here)',
  settings: INCH_LEN(0.75),
  cannot: (_q, _s, set) => above0(set, 'length', 'a length', 'in'),
  recipe: (q, size, set) => stack(`${size} × ${Number(set.length)} in socket head cap screw`, 1, [{ b: made(`${size} SHCS shank`, ALLOY, { cyl: [inch(q.d) / 2, lenIn(set)] }, { color: DARK }) },
    { b: made(`${size} SHCS head`, ALLOY, { cyl: [inch(q.dk) / 2, inch(q.k)] }, { color: DARK, pattern: { name: 'socket', points: [[0, 0]], hole: inch(q.s) / Math.sqrt(3), face: '+y', depth: inch(q.t) } }) }]),
  expect: (q, _s, set) => { const L = lenIn(set), sk = inch(q.s) / Math.sqrt(3); return { bound: [inch(q.dk), L + inch(q.k), inch(q.dk)], mass: (disc(inch(q.d)) * L + disc(inch(q.dk)) * inch(q.k) - Math.PI * sk * sk * inch(q.t)) * rho(ALLOY), tol: 0.01, massTol: 0.02, says: `${said(q)}: its head (dk) by its length and head (k); nominal mass less its socket drawn round` }; },
  tests: [T(2, { offers: ['1/4-20 SHCS head/axis', '1/4-20 SHCS head/socket', '1/4-20 SHCS shank/axis'] })],
};
type SetIn = Uts & { s: number; t: number };
const INCHSET: PartFamily<SetIn> = {
  id: 'piece.inchsetscrew', name: 'Set screw (inch)', gloss: 'A UTS hex socket set screw by its thread and length', domains: FAST, aisle: 'Fasteners / Inch bolts and screws',
  says: 'A hex socket set screw by its UTS thread and its length (in): its body at the thread\'s major diameter and its socket on top drawn round (`<name>/socket`, bd_warehouse\'s socket sizes; its point drawn flat). It goes down a hub\'s tapped hole (Through a line), its point on the shaft',
  rows: Object.fromEntries(csvRows(SETSCREW_SOURCE).map(([k, s, t]) => [k!, { ...utsOf(k!), s: frac(s!), t: frac(t!) }])), size: '1/4-20', source: 'socket sizes as bd_warehouse gives them (imperial_set_screw_parameters.csv, Apache-2.0, copied here)',
  settings: [{ key: 'length', label: 'Length, in', type: 'number', default: 0.25 }],
  cannot: (q, size, set) => above0(set, 'length', 'a length', 'in') ?? (lenIn(set) > inch(q.t) + 1e-9 ? null : `a ${size} set screw longer than its socket (${q.t} in)`),
  recipe: (q, size, set) => made(`${size} × ${Number(set.length)} in set screw`, ALLOY, { cyl: [inch(q.d) / 2, lenIn(set)] }, { color: DARK, pattern: { name: 'socket', points: [[0, 0]], hole: inch(q.s) / Math.sqrt(3), face: '+y', depth: inch(q.t) } }),
  expect: (q, _s, set) => { const L = lenIn(set), sk = inch(q.s) / Math.sqrt(3); return { bound: [inch(q.d), L, inch(q.d)], mass: (disc(inch(q.d)) * L - Math.PI * sk * sk * inch(q.t)) * rho(ALLOY), tol: 0.01, massTol: 0.02, says: `${said(q)}: its thread by its length; nominal mass less its socket drawn round` }; },
  tests: [T(1)],
};
const INCHBUTTON: PartFamily<Uts & { h: [number, number, number, number] }> = {
  id: 'piece.inchbutton', name: 'Button head socket screw (inch)', gloss: 'A UTS button head socket cap screw (ASME B18.3) by its thread and length', domains: FAST, aisle: 'Fasteners / Inch bolts and screws',
  says: 'A button head socket cap screw by its UTS thread and its length under the head (in): its shank and its low domed head (a spherical cap of its diameter and height, approximated), its hex socket drawn round (BOSL2\'s table). Its shank offers its axis',
  rows: utsRows(UTS_BUTTON), size: '#10-32', source: 'ASME B18.3 button heads as BOSL2 gives them (screws.scad UTS_button, BSD-2, copied here)',
  settings: INCH_LEN(0.5),
  cannot: (_q, _s, set) => above0(set, 'length', 'a length', 'in'),
  recipe: (q, size, set) => stack(`${size} × ${Number(set.length)} in button head screw`, 1, [{ b: made(`${size} button shank`, ALLOY, { cyl: [inch(q.d) / 2, lenIn(set)] }, { color: DARK }) },
    { b: made(`${size} button head`, ALLOY, { lathe: { pts: capPts(inch(q.h[0]) / 2, inch(q.h[1])) } }, { color: DARK, pattern: { name: 'socket', points: [[0, 0]], hole: inch(q.h[2]) / Math.sqrt(3), face: '+y', depth: inch(q.h[3]) } }) }]),
  expect: (q, _s, set) => { const L = lenIn(set), sk = inch(q.h[2]) / Math.sqrt(3); return { bound: [inch(q.h[0]), L + inch(q.h[1]), inch(q.h[0])], mass: (disc(inch(q.d)) * L + turnedVol(capPts(inch(q.h[0]) / 2, inch(q.h[1]))) - Math.PI * sk * sk * inch(q.h[3])) * rho(ALLOY), tol: 0.01, massTol: 0.02, says: `${said(q)}: its head across by its length and head; nominal mass, shank and cap less its socket` }; },
  tests: [T(2)],
};
const INCHPAN: PartFamily<Uts & { h: [number, number] }> = {
  id: 'piece.inchpanhead', name: 'Pan head machine screw (inch)', gloss: 'A UTS Phillips pan head machine screw (ASME B18.6.3) by its thread and length', domains: FAST, aisle: 'Fasteners / Inch bolts and screws',
  says: 'A pan head machine screw by its UTS thread and its length under the head (in): its shank and its rounded head (BOSL2\'s Phillips head height; its outline approximated, its recess not drawn). Its shank offers its axis',
  rows: utsRows(UTS_PAN), size: '#6-32', source: 'ASME B18.6.3 pan heads as BOSL2 gives them (screws.scad UTS_pan, BSD-2, copied here)',
  settings: [...INCH_LEN(0.5), { key: 'matter', label: 'Made of', type: 'choice', default: 'zinc', choices: ['zinc', 'stainless'] }],
  cannot: (_q, _s, set) => above0(set, 'length', 'a length', 'in'),
  recipe: (q, size, set) => { const m = set.matter === 'stainless' ? 'stainless-304' : STEEL;
    return stack(`${size} × ${Number(set.length)} in pan head screw`, 1, [{ b: made(`${size} pan shank`, m, { cyl: [inch(q.d) / 2, lenIn(set)] }, { color: ZINC }) }, { b: made(`${size} pan head`, m, { lathe: { pts: panPts(inch(q.h[0]) / 2, inch(q.h[1])) } }, { color: ZINC }) }]); },
  expect: (q, _s, set) => { const L = lenIn(set); return { bound: [inch(q.h[0]), L + inch(q.h[1]), inch(q.h[0])], mass: (disc(inch(q.d)) * L + turnedVol(panPts(inch(q.h[0]) / 2, inch(q.h[1])))) * rho(set.matter === 'stainless' ? 'stainless-304' : STEEL), tol: 0.01, massTol: 0.02, says: `${said(q)}: its head by its length and head; nominal mass, shank and head turned` }; },
  tests: [T(2, { offers: ['#6-32 pan head/axis', '#6-32 pan shank/axis'] })],
};
const INCHFILL: PartFamily<Uts & { h: [number, number] }> = {
  id: 'piece.inchfillister', name: 'Fillister head machine screw (inch)', gloss: 'A UTS fillister head machine screw (ASME B18.6.3) by its thread and length', domains: FAST, aisle: 'Fasteners / Inch bolts and screws',
  says: 'A fillister head machine screw by its UTS thread and its length under the head (in): its shank and its tall round head (BOSL2\'s table; its crown and slot not drawn). Its shank offers its axis; it sits down a counterbore',
  rows: utsRows(UTS_FILLISTER), size: '#8-32', source: 'ASME B18.6.3 fillister heads as BOSL2 gives them (screws.scad UTS_fillister, BSD-2, copied here)',
  settings: INCH_LEN(0.5),
  cannot: (_q, _s, set) => above0(set, 'length', 'a length', 'in'),
  recipe: (q, size, set) => stack(`${size} × ${Number(set.length)} in fillister head screw`, 1, [{ b: made(`${size} fillister shank`, STEEL, { cyl: [inch(q.d) / 2, lenIn(set)] }, { color: ZINC }) }, { b: made(`${size} fillister head`, STEEL, { cyl: [inch(q.h[0]) / 2, inch(q.h[1])] }, { color: ZINC }) }]),
  expect: (q, _s, set) => { const L = lenIn(set); return { bound: [inch(q.h[0]), L + inch(q.h[1]), inch(q.h[0])], mass: (disc(inch(q.d)) * L + disc(inch(q.h[0])) * inch(q.h[1])) * rho(STEEL), tol: 0.01, massTol: 0.02, says: `${said(q)}: its head by its length and head; nominal mass, shank and head` }; },
  tests: [T(2)],
};

// ---- inch nuts ---------------------------------------------------------------------------------------------------
const nutRows = (kind: 'hex' | 'jam' | 'thick', from: number) => Object.fromEntries(Object.entries(UTS_THREAD).filter(([nom]) => UTS_NOMINAL[nom]! >= from - 1e-9 && UTS_NOMINAL[nom]! <= 1.5 + 1e-9)
  .flatMap(([nom, t]) => t.filter((x) => x > 0).map((tpi) => { const k = `${nom}-${tpi}`; return [k, { ...utsOf(k), ...utsNut(nom, kind) }]; })));
type NutIn = Uts & { m: number; s: number };
const inchNut = (id: string, name: string, kind: 'hex' | 'jam' | 'thick', from: number, std: string, size: string): PartFamily<NutIn> => ({
  id, name, gloss: `A UTS ${name.toLowerCase()} (ASME B18.2.2) by its thread`, domains: FAST, aisle: 'Fasteners / Inch nuts',
  says: `A ${name.toLowerCase()} by its UTS thread (UNC or UNF; ASME B18.2.2, ${std}): its hex, bored at the thread's major diameter (the thread not drawn: a UNC and a UNF row draw alike). It slides over a bolt's shank (Over a shaft) and offers its axis`,
  rows: nutRows(kind, from), size, source: `ASME B18.2.2 as BOSL2 works it (screws.scad _nut_info_english, BSD-2, copied here: ${std})`,
  recipe: (q, sz) => made(`${sz} ${kind === 'hex' ? 'hex nut' : kind === 'jam' ? 'jam nut' : 'thick nut'}`, STEEL, { hex: [inch(q.s), inch(q.m), inch(q.d) / 2] }, { color: ZINC }),
  expect: (q) => ({ bound: [corners(inch(q.s)), inch(q.m), corners(inch(q.s))], mass: (hexA(inch(q.s)) - disc(inch(q.d))) * inch(q.m) * rho(STEEL), tol: 0.01, massTol: 0.02, says: `${said(q)}: across corners by its thickness; nominal mass, the hex less its bore` }),
  tests: [T(1)],
});
const INCHNUT = inchNut('piece.inchnut', 'Hex nut (inch)', 'hex', 0, 'its table for #0 to 1/4, its rule above', '1/4-20');
const INCHJAM = inchNut('piece.inchjamnut', 'Hex jam nut (inch)', 'jam', 0.25, 'its thin nuts; the 1/4 nut\'s width its hex nut\'s', '1/2-13');
const INCHTHICK = inchNut('piece.inchthicknut', 'Hex thick nut (inch)', 'thick', 0.25, 'its thick nuts; the 1/4 nut\'s width its hex nut\'s', '1/2-13');
type SqIn = { nom: string; d: number; tpi: number; m: number; s: number };
const INCHSQUARE: PartFamily<SqIn> = {
  id: 'piece.inchsquarenut', name: 'Square nut (inch)', gloss: 'A UTS square nut (ASME B18.2.2) by its size, coarse thread', domains: FAST, aisle: 'Fasteners / Inch nuts',
  says: 'A square nut by its UTS size (its UNC thread, ASME B18.2.2 as BOSL2 works it), its tapped hole drawn at the thread\'s major diameter and offered as `<name>/thread`: a bolt goes through it (Through a line); it drops into a slot and cannot turn',
  rows: Object.fromEntries(Object.entries(UTS_THREAD).filter(([nom, t]) => t[0] > 0 && UTS_NOMINAL[nom]! <= 1.5).map(([nom, t]) => [nom, { nom, d: UTS_NOMINAL[nom]!, tpi: t[0], ...utsNut(nom, 'square') }])), size: '1/4',
  source: 'ASME B18.2.2 square nuts as BOSL2 works them (screws.scad _nut_info_english, BSD-2, copied here)',
  recipe: (q, size) => made(`${size}-${q.tpi} square nut`, STEEL, { box: [inch(q.s), inch(q.m), inch(q.s)] }, { color: ZINC, pattern: { name: 'thread', points: [[0, 0]], hole: inch(q.d) / 2 } }),
  expect: (q) => ({ bound: [inch(q.s), inch(q.m), inch(q.s)], mass: (inch(q.s) ** 2 - disc(inch(q.d))) * inch(q.m) * rho(STEEL), tol: 0.01, massTol: 0.02, says: `${q.nom}-${q.tpi} UNC: its square by its thickness; nominal mass less its hole` }),
  tests: [T(1, { offers: ['1/4-20 square nut/thread'] })],
};

// ---- inch washers (typical: recalled from makers' tables of ASME B18.22.1 and B18.21.1) ----------------------------
/** Plain washers, ASME B18.22.1 Type A (in): [narrow (SAE) ID, OD, t, wide (USS) ID, OD, t], recalled (typical). */
export const B1822: Record<string, [number, number, number, number, number, number]> = {
  '#6': [0.156, 0.375, 0.049, 0.188, 0.438, 0.049], '#8': [0.188, 0.438, 0.049, 0.25, 0.5, 0.049], '#10': [0.219, 0.5, 0.049, 0.25, 0.562, 0.065], '#12': [0.25, 0.562, 0.065, 0.281, 0.625, 0.065],
  '1/4': [0.281, 0.625, 0.065, 0.312, 0.734, 0.065], '5/16': [0.344, 0.688, 0.065, 0.375, 0.875, 0.083], '3/8': [0.406, 0.812, 0.065, 0.438, 1, 0.083], '7/16': [0.469, 0.922, 0.065, 0.5, 1.25, 0.083],
  '1/2': [0.531, 1.062, 0.095, 0.562, 1.375, 0.109], '9/16': [0.594, 1.156, 0.095, 0.625, 1.469, 0.109], '5/8': [0.656, 1.312, 0.095, 0.688, 1.75, 0.134], '3/4': [0.812, 1.469, 0.134, 0.812, 2, 0.148],
  '7/8': [0.938, 1.75, 0.134, 0.938, 2.25, 0.165], '1': [1.062, 2, 0.134, 1.062, 2.5, 0.165],
};
/** Helical spring lock washers, ASME B18.21.1 regular (in): inside, outside, thickness, recalled (typical). */
export const B1821: Record<string, [number, number, number]> = {
  '#2': [0.088, 0.172, 0.02], '#4': [0.115, 0.209, 0.025], '#5': [0.128, 0.236, 0.031], '#6': [0.141, 0.25, 0.031], '#8': [0.168, 0.293, 0.04], '#10': [0.194, 0.334, 0.047], '#12': [0.221, 0.377, 0.056],
  '1/4': [0.255, 0.487, 0.062], '5/16': [0.319, 0.583, 0.078], '3/8': [0.382, 0.68, 0.094], '7/16': [0.446, 0.776, 0.109], '1/2': [0.509, 0.869, 0.125], '9/16': [0.573, 0.965, 0.141],
  '5/8': [0.636, 1.072, 0.156], '3/4': [0.763, 1.259, 0.188], '7/8': [0.89, 1.446, 0.219], '1': [1.017, 1.637, 0.25],
};
type Ring = { id: number; od: number; t: number };
const inchWasher = (id: string, name: string, rows: Record<string, Ring>, std: string, mat: string): PartFamily<Ring> => ({
  id, name, gloss: `A ${name.toLowerCase()} by its screw size (${std})`, domains: FAST, aisle: 'Fasteners / Inch washers',
  says: `A ${name.toLowerCase()} (${std}) by the screw it is for: a ring of its inside, outside and thickness${mat === 'steel-spring' ? ' (its split and its twist not drawn: drawn flat and closed)' : ''}. It slides over a bolt's shank (Over a shaft) under its nut or head`,
  rows, size: '1/4', source: `${std}, recalled from makers' tables, read from no source here (typical)`,
  recipe: (q, size) => made(`${size} ${name.toLowerCase()}`, mat, { tube: [inch(q.id) / 2, inch(q.od) / 2, inch(q.t)] }, { color: mat === 'steel-spring' ? DARK : ZINC }),
  expect: (q) => ({ bound: [inch(q.od), inch(q.t), inch(q.od)], mass: annulus(inch(q.od), inch(q.id)) * inch(q.t) * rho(mat), tol: 0.01, massTol: 0.02, says: 'its outside by its thickness; nominal mass, the ring' }),
  tests: [T(1)],
});
const SAE = inchWasher('piece.saewasher', 'SAE flat washer', Object.fromEntries(Object.entries(B1822).map(([k, r]) => [k, { id: r[0], od: r[1], t: r[2] }])), 'ASME B18.22.1 Type A, narrow (SAE)', STEEL);
const USS = inchWasher('piece.usswasher', 'USS flat washer', Object.fromEntries(Object.entries(B1822).map(([k, r]) => [k, { id: r[3], od: r[4], t: r[5] }])), 'ASME B18.22.1 Type A, wide (USS)', STEEL);
const INCHLOCK = inchWasher('piece.inchlockwasher', 'Split lock washer (inch)', Object.fromEntries(Object.entries(B1821).map(([k, r]) => [k, { id: r[0], od: r[1], t: r[2] }])), 'ASME B18.21.1 regular helical spring', 'steel-spring');

// ---- tapping screws (ISO 1478 threads; heads recalled from makers' tables: typical) -----------------------------
/** Tapping screw threads, ISO 1478 (mm): d1 max, and its C point's length y (recalled, typical). */
export const ISO1478: Record<string, { d: number; y: number }> = {
  'ST2.2': { d: 2.24, y: 2 }, 'ST2.9': { d: 2.9, y: 2.6 }, 'ST3.5': { d: 3.53, y: 3.2 }, 'ST3.9': { d: 3.91, y: 3.5 }, 'ST4.2': { d: 4.22, y: 3.7 },
  'ST4.8': { d: 4.8, y: 4.3 }, 'ST5.5': { d: 5.46, y: 5 }, 'ST6.3': { d: 6.25, y: 6 }, 'ST8': { d: 8, y: 7.5 }, 'ST9.5': { d: 9.65, y: 8 },
};
/** Their heads (mm): ISO 7049 pan [dk, k], ISO 7050 countersunk [dk, k], ISO 1481 slotted pan [dk, k], ISO 1479 hex [s, k]; recalled (typical). */
export const TAPPING_HEADS: Record<string, { pan: [number, number]; csk: [number, number]; slotted: [number, number]; hex: [number, number] }> = {
  'ST2.2': { pan: [4, 1.6], csk: [3.8, 1.1], slotted: [4, 1.3], hex: [3.2, 1.6] }, 'ST2.9': { pan: [5.6, 2.4], csk: [5.5, 1.7], slotted: [5.6, 1.8], hex: [5, 2.3] },
  'ST3.5': { pan: [7, 2.6], csk: [7.3, 2.35], slotted: [7, 2.1], hex: [5.5, 2.6] }, 'ST3.9': { pan: [7.5, 2.8], csk: [8, 2.6], slotted: [7.5, 2.3], hex: [7, 3] },
  'ST4.2': { pan: [8, 3.1], csk: [8.4, 2.6], slotted: [8, 2.4], hex: [7, 3] }, 'ST4.8': { pan: [9.5, 3.7], csk: [9.3, 2.8], slotted: [9.5, 3], hex: [8, 3.8] },
  'ST5.5': { pan: [11, 4], csk: [10.3, 3], slotted: [11, 3.2], hex: [8, 4.1] }, 'ST6.3': { pan: [12, 4.6], csk: [11.3, 3.15], slotted: [12, 3.6], hex: [10, 4.7] },
  'ST8': { pan: [16, 6], csk: [15.8, 4.65], slotted: [16, 4.8], hex: [13, 6] }, 'ST9.5': { pan: [20, 7.5], csk: [18.3, 5.25], slotted: [20, 6], hex: [16, 7.5] },
};
type Tap = { d: number; y: number; a: number; k: number };
const tapping = (id: string, name: string, std: string, head: 'pan' | 'csk' | 'slotted' | 'hex'): PartFamily<Tap> => {
  const rows = Object.fromEntries(Object.entries(ISO1478).map(([k, r]) => [k, { ...r, a: TAPPING_HEADS[k]![head][0], k: TAPPING_HEADS[k]![head][1] }]));
  const inLen = head === 'csk'; // (a countersunk screw's length counts its head)
  const shankOf = (q: Tap, set: Record<string, unknown>) => len(set) - mm(q.y) - (inLen ? mm(q.k) : 0);
  const headOf = (q: Tap, size: string): Block => head === 'csk' ? made(`${size} ${name} head`, STEEL, { cone: [mm(q.d) / 2, mm(q.a) / 2, mm(q.k)] }, { color: ZINC })
    : head === 'hex' ? made(`${size} ${name} head`, STEEL, { hex: [mm(q.a), mm(q.k)] }, { color: ZINC }) : made(`${size} ${name} head`, STEEL, { lathe: { pts: panPts(mm(q.a) / 2, mm(q.k)) } }, { color: ZINC });
  const headVol = (q: Tap) => head === 'csk' ? frustum(mm(q.d) / 2, mm(q.a) / 2, mm(q.k)) : head === 'hex' ? hexA(mm(q.a)) * mm(q.k) : turnedVol(panPts(mm(q.a) / 2, mm(q.k)));
  const W = (q: Tap) => (head === 'hex' ? corners(mm(q.a)) : mm(q.a));
  return {
    id, name, gloss: `A ${name.toLowerCase()} (${std}) by its ST size and length`, domains: FAST, aisle: 'Fasteners / Tapping screws',
    says: `A ${name.toLowerCase()} (${std}; ISO 1478 thread, its C point): its point, its shank at the thread's outside and its ${head === 'csk' ? 'countersunk head (counted in its length)' : head === 'hex' ? 'hex head' : 'pan head (its outline approximated)'}, its thread and recess not drawn. Its shank offers its axis; it goes down a pilot hole in sheet or plastic (Through a line) and cuts its own thread`,
    rows, size: 'ST4.2', source: `ISO 1478 threads and ${std} heads, recalled from makers' tables, read from no source here (typical)`,
    settings: [{ key: 'length', label: inLen ? 'Length (head included), mm' : 'Length under the head, mm', type: 'number', default: 13 }],
    cannot: (q, size, set) => above0(set, 'length', 'a length') ?? (shankOf(q, set) > 0 ? null : `a ${size} screw longer than its point${inLen ? ' and head' : ''} (${n3(q.y + (inLen ? q.k : 0))} mm)`),
    recipe: (q, size, set) => stack(`${size} × ${Number(set.length)} ${name.toLowerCase()}`, 1, [{ b: made(`${size} ${name} point`, STEEL, { cone: [0, mm(q.d) / 2, mm(q.y)] }, { color: ZINC }) }, { b: made(`${size} ${name} shank`, STEEL, { cyl: [mm(q.d) / 2, shankOf(q, set)] }, { color: ZINC }) }, { b: headOf(q, size) }]),
    expect: (q, _s, set) => ({ bound: [W(q), len(set) + (inLen ? 0 : mm(q.k)), W(q)], mass: (frustum(0, mm(q.d) / 2, mm(q.y)) + disc(mm(q.d)) * shankOf(q, set) + headVol(q)) * rho(STEEL), tol: 0.01, massTol: 0.02, says: 'its head across by point, shank and head; nominal mass, the three solid' }),
    tests: [T(3)],
  };
};
const TAPPAN = tapping('piece.tappingpan', 'Pan head tapping screw', 'ISO 7049, cross recessed', 'pan');
const TAPCSK = tapping('piece.tappingcsk', 'Countersunk tapping screw', 'ISO 7050, cross recessed', 'csk');
const TAPSLOT = tapping('piece.tappingslotted', 'Slotted pan head tapping screw', 'ISO 1481', 'slotted');
const TAPHEX = tapping('piece.tappinghex', 'Hex head tapping screw', 'ISO 1479', 'hex');

// ---- studs (the metal end b1 by each standard's own definition; sizes typical of makers' tables) ------------------
const STUD_SIZES = ['M4', 'M5', 'M6', 'M8', 'M10', 'M12', 'M14', 'M16', 'M18', 'M20', 'M22', 'M24', 'M27', 'M30'];
type Stud = { d: number; b1: number };
const stud = (id: string, std: string, k: number): PartFamily<Stud> => ({
  id, name: `Stud (${std})`, gloss: `A stud with its metal end ${k} d long (${std}) by its size and length`, domains: FAST, aisle: 'Fasteners / Studs',
  says: `A stud (${std}): its metal end, ${k} d long, that screws into a tapped hole, and its nut end so long (its length), both at the thread's size (the thread and its plain run-out not drawn). Each end offers its axis (\`<name> metal end/axis\`, \`<name> nut end/axis\`): a nut and washer slide over the nut end (Over a shaft); the metal end goes down a tapped hole (Through a line)`,
  rows: Object.fromEntries(STUD_SIZES.map((s) => [s, { d: METRIC[s]!.d, b1: +(k * METRIC[s]!.d).toFixed(2) }])), size: 'M10', source: `${std} (its metal end b1 = ${k} d, by the standard's own definition; its sizes M4 to M30 typical of makers' tables)`,
  settings: [{ key: 'length', label: 'Length (the nut end), mm', type: 'number', default: 40 }],
  cannot: (q, size, set) => above0(set, 'length', 'a length') ?? (Number(set.length) >= q.d ? null : `${std} makes no ${size} stud shorter than its diameter (${Number(set.length)} mm asked)`),
  recipe: (q, size, set) => stack(`${size} × ${Number(set.length)} stud ${std}`, 1, [{ b: made(`${size} stud metal end`, ALLOY, { cyl: [mm(q.d) / 2, mm(q.b1)] }, { color: ZINC }) }, { b: made(`${size} stud nut end`, ALLOY, { cyl: [mm(q.d) / 2, len(set)] }, { color: ZINC }) }]),
  expect: (q, _s, set) => ({ bound: [mm(q.d), mm(q.b1) + len(set), mm(q.d)], mass: disc(mm(q.d)) * (mm(q.b1) + len(set)) * rho(ALLOY), tol: 0.01, massTol: 0.02, says: 'its size by its metal end and length; nominal mass, the rod' }),
  tests: [T(2, { offers: ['M10 stud metal end/axis', 'M10 stud nut end/axis'] })],
});
const STUD938 = stud('piece.stud938', 'DIN 938', 1), STUD939 = stud('piece.stud939', 'DIN 939', 1.25), STUD835 = stud('piece.stud835', 'DIN 835', 2);

// ---- lifting points: eye bolts and eye nuts --------------------------------------------------------------------
/** Lifting eye bolts, DIN 580 (mm): eye inside d2, eye outside d3, collar d4, height h above the face, collar k, shank l;
 *  WLL straight up, kg. Recalled from makers' tables, read from no source here (typical). */
export const DIN580: Record<string, { d2: number; d3: number; d4: number; h: number; k: number; l: number; wll: number }> = {
  M8: { d2: 20, d3: 36, d4: 20, h: 36, k: 6, l: 13, wll: 140 }, M10: { d2: 25, d3: 45, d4: 25, h: 45, k: 8, l: 17, wll: 230 }, M12: { d2: 30, d3: 54, d4: 30, h: 53, k: 10, l: 20.5, wll: 340 },
  M16: { d2: 35, d3: 63, d4: 35, h: 62, k: 12, l: 27, wll: 700 }, M20: { d2: 40, d3: 72, d4: 40, h: 71, k: 14, l: 30, wll: 1200 }, M24: { d2: 50, d3: 90, d4: 50, h: 90, k: 18, l: 36, wll: 1800 },
  M30: { d2: 65, d3: 108, d4: 65, h: 109, k: 22, l: 45, wll: 3200 }, M36: { d2: 75, d3: 126, d4: 75, h: 128, k: 26, l: 54, wll: 4600 }, M42: { d2: 85, d3: 144, d4: 85, h: 147, k: 30, l: 63, wll: 6300 },
  M48: { d2: 100, d3: 166, d4: 100, h: 168, k: 35, l: 68, wll: 8600 },
};
type Eye = { d: number; d2: number; d3: number; d4: number; h: number; k: number; l: number; wll: number };
const EYE_ROWS: Record<string, Eye> = Object.fromEntries(Object.entries(DIN580).map(([k, r]) => [k, { d: METRIC[k]!.d, ...r }]));
/** An eye: a round bar bent into a ring standing up, as a run of two half bends (its ends meet on one plane). */
const eyeOf = (name: string, mat: string, inside: number, outside: number): Block => { const ro = (outside - inside) / 4, R = (inside + outside) / 4, half = { name, mat, ro, bend: 180, R, color: BRIGHT };
  return run(name, [half, { ...half, name: `${name} 2` }]); };
const eyeVol = (q: { d2: number; d3: number }) => torusVol(mm(q.d2 + q.d3) / 4, mm(q.d3 - q.d2) / 4);
const EYEBOLT: PartFamily<Eye> = {
  id: 'piece.eyebolt', name: 'Lifting eye bolt', gloss: 'A collared lifting eye bolt (DIN 580) by its thread', domains: RIG, aisle: 'Rigging / Lifting points',
  says: 'A lifting eye bolt (DIN 580; its sizes and working load recalled, typical): its threaded shank (the thread not drawn), its collar on it and its eye standing on the collar, a ring of round bar (drawn standing on the collar: the real eye\'s foot is forged into its collar, so the drawn eye stands its collar\'s height above its row\'s h). Its shank offers its axis: it goes down a tapped hole (Through a line), its collar on the face; a shackle\'s pin goes through its eye. Its working load is said, straight up',
  rows: EYE_ROWS, size: 'M12', source: 'DIN 580, recalled from makers\' tables, read from no source here (typical)',
  recipe: (q, size) => stack(`${size} eye bolt (WLL ${q.wll} kg)`, 1, [{ b: made(`${size} eye bolt shank`, 'steel-low', { cyl: [mm(q.d) / 2, mm(q.l)] }, { color: BRIGHT }) }, { b: made(`${size} eye bolt collar`, 'steel-low', { cyl: [mm(q.d4) / 2, mm(q.k)] }, { color: BRIGHT }) }, { b: eyeOf(`${size} eye bolt eye`, 'steel-low', mm(q.d2), mm(q.d3)) }]),
  expect: (q) => ({ bound: [mm(Math.max(q.d3, q.d4)), mm(q.l + q.k + q.d3), mm(Math.max(q.d4, (q.d3 - q.d2) / 2))], mass: (disc(mm(q.d)) * mm(q.l) + disc(mm(q.d4)) * mm(q.k) + eyeVol(q)) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: `its eye across by shank, collar and eye (its row's h ${q.h} mm: drawn ${q.k} mm higher); nominal mass, shank, collar and the eye's torus` }),
  tests: [T(4, { offers: ['M12 eye bolt collar/axis', 'M12 eye bolt shank/axis'] })],
};
const EYENUT: PartFamily<Eye> = {
  id: 'piece.eyenut', name: 'Lifting eye nut', gloss: 'A lifting eye nut (DIN 582) by its thread', domains: RIG, aisle: 'Rigging / Lifting points',
  says: 'A lifting eye nut (DIN 582; its eye as DIN 580\'s, its boss k + d high, typical): its boss, tapped through at the thread\'s size (`<name> boss/axis`), and its eye standing on it. A stud or bolt end goes up into its boss (Through a line), or it slides over a threaded rod\'s end (Over a shaft)',
  rows: EYE_ROWS, size: 'M12', source: 'DIN 582, its eye recalled as DIN 580\'s (typical); its boss\'s height k + d, typical',
  recipe: (q, size) => stack(`${size} eye nut (WLL ${q.wll} kg)`, 1, [{ b: made(`${size} eye nut boss`, 'steel-low', { tube: [mm(q.d) / 2, mm(q.d4) / 2, mm(q.k + q.d)] }, { color: BRIGHT, tapped: true }) }, { b: eyeOf(`${size} eye nut eye`, 'steel-low', mm(q.d2), mm(q.d3)) }]),
  expect: (q) => ({ /* bound not held since root 1 (2026-11-07): the solids rest where they first touch (the eye into the boss's bore edge, the eye bolts into the bosses, the U-bolt legs down the holes), so the row's stacked height no longer applies; the physical height is not yet derived: plan/FIX-PLAN.md */ mass: (annulus(mm(q.d4), mm(q.d)) * mm(q.k + q.d) + eyeVol(q)) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its eye across by boss and eye; nominal mass, the boss less its bore and the eye\'s torus' }),
  tests: [T(3, { offers: ['M12 eye nut boss/axis'] })],
};

// ---- U-bolts, DIN 3570 A --------------------------------------------------------------------------------------
/** Round-steel U-bolts for pipe, DIN 3570 form A (mm): the pipe's outside, its thread, the inside width d2 and the inside
 *  height L (from the bow's inside to its legs' ends). Recalled from makers' tables, read from no source here (typical). */
export const DIN3570: Record<string, { od: number; t: string; d2: number; L: number }> = {
  'DN15 21.3': { od: 21.3, t: 'M10', d2: 22, L: 60 }, 'DN20 26.9': { od: 26.9, t: 'M10', d2: 28, L: 68 }, 'DN25 33.7': { od: 33.7, t: 'M10', d2: 35, L: 76 }, 'DN32 42.4': { od: 42.4, t: 'M10', d2: 44, L: 85 },
  'DN40 48.3': { od: 48.3, t: 'M12', d2: 50, L: 95 }, 'DN50 60.3': { od: 60.3, t: 'M12', d2: 62, L: 108 }, 'DN65 76.1': { od: 76.1, t: 'M12', d2: 78, L: 124 }, 'DN80 88.9': { od: 88.9, t: 'M16', d2: 90, L: 145 },
  'DN100 114.3': { od: 114.3, t: 'M16', d2: 116, L: 172 }, 'DN125 139.7': { od: 139.7, t: 'M16', d2: 142, L: 198 }, 'DN150 168.3': { od: 168.3, t: 'M16', d2: 170, L: 226 }, 'DN200 219.1': { od: 219.1, t: 'M20', d2: 222, L: 290 },
  'DN250 273': { od: 273, t: 'M20', d2: 276, L: 345 }, 'DN300 323.9': { od: 323.9, t: 'M20', d2: 326, L: 395 },
};
type Ub = { od: number; t: string; d: number; d2: number; L: number };
/** An upside-down U: a leg, a half bend round its inside width, a leg; each leg offering its axis. */
const uOf = (name: string, mat: string, d: number, inside: number, leg: number, color = ZINC): Block => run(name, [{ name: `${name} leg 1`, mat, ro: d / 2, straight: leg, color }, { name: `${name} bow`, mat, ro: d / 2, bend: 180, R: (inside + d) / 2, color }, { name: `${name} leg 2`, mat, ro: d / 2, straight: leg, color }]);
const uVol = (d: number, inside: number, leg: number) => disc(d) * (2 * leg + Math.PI * (inside + d) / 2);
const UBOLT: PartFamily<Ub> = {
  id: 'piece.ubolt', name: 'U-bolt', gloss: 'A round-steel U-bolt for a pipe (DIN 3570 A) by the pipe it holds', domains: ['mechanical', 'structural', 'pipelines'], aisle: 'Rigging / U-bolts and clamps',
  says: 'A U-bolt for a pipe (DIN 3570 form A, by the pipe\'s DN and outside; typical): a round bar bent over the pipe, as a run (a leg, a half bend round its inside width, a leg; the threads on its legs not drawn), with an ISO 4032 nut on each leg\'s end if asked. Each leg offers its axis (`<name> leg 1/axis`, `leg 2/axis`): it goes over a pipe and down through a plate\'s two holes (Through a line), a nut and washer over each leg (Over a shaft)',
  rows: Object.fromEntries(Object.entries(DIN3570).map(([k, r]) => [k, { ...r, d: METRIC[r.t]!.d }])), size: 'DN25 33.7', source: 'DIN 3570 A, recalled from makers\' tables, read from no source here (typical); nuts ISO 4032 (src/nexus/parts/bdw.ts)',
  settings: [{ key: 'nuts', label: 'Nuts', type: 'choice', default: 'none', choices: ['none', 'on both legs'] }],
  recipe: (q, size, set) => { const name = `${size} U-bolt`; let b = uOf(name, STEEL, mm(q.d), mm(q.d2), mm(q.L - q.d2 / 2));
    if (set.nuts === 'on both legs') b = over(over(b, `${name} leg 1/axis`, isoNut(q.t), 'lo', 'touch'), `${name} leg 2/axis`, isoNut(q.t), 'lo', 'touch');
    return b; },
  expect: (q, _s, set) => { const nuts = set.nuts === 'on both legs', m = METRIC[q.t]!, e = corners(mm(m.s!));
    return { bound: [nuts ? mm(q.d2 + q.d) + e : mm(q.d2 + 2 * q.d), mm(q.L + q.d), nuts ? e : mm(q.d)], mass: uVol(mm(q.d), mm(q.d2), mm(q.L - q.d2 / 2)) * rho(STEEL) + (nuts ? 2 * (hexA(mm(m.s!)) - disc(mm(m.d))) * mm(m.m!) * rho(STEEL) : 0), tol: 0.01, massTol: 0.02, says: `its legs' outside (or nuts across corners) by its inside height and bar; nominal mass, the bent bar${nuts ? ' and its nuts' : ''}` }; },
  tests: [T(3, { offers: ['DN25 33.7 U-bolt leg 1/axis', 'DN25 33.7 U-bolt leg 2/axis'] }), T(5, {}, { nuts: 'on both legs' })],
};

// ---- shackles --------------------------------------------------------------------------------------------------
/** Screw-pin D shackles (in): working load (t), inside width A at the pin, pin B, inside length C, bow's bar D. Recalled
 *  from makers' tables of the US federal RR-C-271 sizes, read from no source here (typical). */
export const SHACKLES: Record<string, { wll: number; A: number; B: number; C: number; D: number }> = {
  '3/16': { wll: 0.33, A: 0.38, B: 0.25, C: 0.88, D: 0.19 }, '1/4': { wll: 0.5, A: 0.47, B: 0.31, C: 1.13, D: 0.25 }, '5/16': { wll: 0.75, A: 0.53, B: 0.38, C: 1.22, D: 0.31 },
  '3/8': { wll: 1, A: 0.66, B: 0.44, C: 1.44, D: 0.38 }, '7/16': { wll: 1.5, A: 0.75, B: 0.5, C: 1.69, D: 0.44 }, '1/2': { wll: 2, A: 0.81, B: 0.63, C: 1.88, D: 0.5 },
  '5/8': { wll: 3.25, A: 1.06, B: 0.75, C: 2.38, D: 0.63 }, '3/4': { wll: 4.75, A: 1.25, B: 0.88, C: 2.81, D: 0.75 }, '7/8': { wll: 6.5, A: 1.44, B: 1, C: 3.31, D: 0.88 },
  '1': { wll: 8.5, A: 1.69, B: 1.13, C: 3.75, D: 1 }, '1 1/8': { wll: 9.5, A: 1.81, B: 1.25, C: 4.25, D: 1.13 }, '1 1/4': { wll: 12, A: 2.03, B: 1.38, C: 4.69, D: 1.25 },
  '1 3/8': { wll: 13.5, A: 2.25, B: 1.5, C: 5.25, D: 1.38 }, '1 1/2': { wll: 17, A: 2.38, B: 1.63, C: 5.75, D: 1.5 },
};
type Shk = { wll: number; A: number; B: number; C: number; D: number };
const SHACKLE: PartFamily<Shk> = {
  id: 'piece.shackle', name: 'Shackle', gloss: 'A screw-pin D shackle by its nominal size (in), its working load said', domains: RIG, aisle: 'Rigging / Shackles and links',
  says: 'A screw-pin D shackle by its nominal size (in; sizes and working load typical): its bow, a round bar bent as a run (a leg, a half bend, a leg), and its pin laid across its legs\' ends (the pin\'s eyes in the legs and its thread not drawn: approximated). Its pin offers its axis, across (`<name> pin/axis`), for an eye or a link it goes through; each leg offers its axis',
  rows: SHACKLES, size: '1/2', source: 'US federal RR-C-271 sizes, recalled from makers\' tables, read from no source here (typical)',
  recipe: (q, size) => { const pin = turn(made(`${size} shackle pin`, ALLOY, { cyl: [inch(q.B) / 2, inch(q.A + 2 * q.D + q.B)] }, { color: 0xb02020 }), 2, 90);
    return stack(`${size} in shackle (WLL ${q.wll} t)`, 1, [{ b: pin }, { b: uOf(`${size} shackle`, ALLOY, inch(q.D), inch(q.A), inch(q.C - q.A / 2), 0xb02020) }]); },
  expect: (q) => ({ bound: [inch(q.A + 2 * q.D + q.B), inch(q.B + q.C + q.D), inch(Math.max(q.B, q.D))], mass: (uVol(inch(q.D), inch(q.A), inch(q.C - q.A / 2)) + disc(inch(q.B)) * inch(q.A + 2 * q.D + q.B)) * rho(ALLOY), tol: 0.01, massTol: 0.02, says: 'its pin across by pin, inside length and bow; nominal mass, the bent bar and its pin' }),
  tests: [T(4, { offers: ['1/2 shackle leg 1/axis', '1/2 shackle leg 2/axis', '1/2 shackle pin/axis'] })],
};

// ---- short-link chain, DIN 766 ---------------------------------------------------------------------------------
/** Short-link chain, DIN 766 (grade 30): its wire d × pitch t (mm), mass kg/m and working load kg; the inside width
 *  1.35 d. Recalled from makers' tables, read from no source here (typical). */
export const DIN766: Record<string, { d: number; t: number; kgm: number; wll: number }> = {
  '3 × 16': { d: 3, t: 16, kgm: 0.18, wll: 100 }, '4 × 16': { d: 4, t: 16, kgm: 0.32, wll: 160 }, '5 × 18.5': { d: 5, t: 18.5, kgm: 0.5, wll: 250 }, '6 × 18.5': { d: 6, t: 18.5, kgm: 0.75, wll: 400 },
  '7 × 22': { d: 7, t: 22, kgm: 1, wll: 500 }, '8 × 24': { d: 8, t: 24, kgm: 1.35, wll: 800 }, '10 × 28': { d: 10, t: 28, kgm: 2.25, wll: 1250 }, '13 × 36': { d: 13, t: 36, kgm: 3.8, wll: 2000 },
  '16 × 45': { d: 16, t: 45, kgm: 5.8, wll: 3150 }, '20 × 56': { d: 20, t: 56, kgm: 9, wll: 5000 },
};
type Chain = { d: number; t: number; kgm: number; wll: number };
const linkOf = (name: string, q: Chain): Block => { const b1 = 1.35 * q.d, s = mm(q.t - b1), ro = mm(q.d) / 2, R = mm(b1 + q.d) / 2, c = { mat: STEEL, ro, color: ZINC };
  return run(name, [{ name: `${name} side`, ...c, straight: s }, { name: `${name} end`, ...c, bend: 180, R }, { name: `${name} side 2`, ...c, straight: s }, { name: `${name} end 2`, ...c, bend: 180, R }]); };
const CHAIN: PartFamily<Chain> = {
  id: 'piece.chain', name: 'Short-link chain', gloss: 'A length of short-link chain (DIN 766) by its wire and pitch, so many links', domains: RIG, aisle: 'Rigging / Chain',
  says: 'Short-link chain (DIN 766, grade 30; its sizes and working load typical) by its wire × pitch: each link a run (two sides and two half bends closing on one plane), each next one turned a quarter about the chain, stacked end to end (drawn apart, not threaded through each other: its length is links × (t + 2d), not links × t). Its working load is said',
  rows: DIN766, size: '6 × 18.5', source: 'DIN 766, recalled from makers\' tables, read from no source here (typical)',
  settings: [{ key: 'links', label: 'Links', type: 'number', default: 5 }],
  cannot: (_q, _s, set) => (Number.isInteger(Number(set.links)) && Number(set.links) >= 1 && Number(set.links) <= 200 ? null : `a whole number of links, 1 to 200 (${String(set.links)})`),
  recipe: (q, size, set) => { const n = Number(set.links);
    return stack(`${size} chain, ${n} links (WLL ${q.wll} kg)`, 1, Array.from({ length: n }, (_, i) => { const l = linkOf(`${size} link ${i + 1}`, q); return { b: i % 2 ? turn(l, 1, 90) : l }; })); },
  // (the row's mass a metre, by its pitch, held against the links drawn: their bend is drawn round the inside width
  // 1.35 d, typical, so the row's mass checks that width; within 12 %)
  expect: (q, _s, set) => { const n = Number(set.links); return { bound: [mm(3.35 * q.d), n * mm(q.t + 2 * q.d), n > 1 ? mm(3.35 * q.d) : mm(q.d)], mass: n * q.kgm * mm(q.t), tol: 0.01, massTol: 0.12, says: `${n} links end to end; its row's ${q.kgm} kg/m by its pitch` }; },
  tests: [T(20), T(4, {}, { links: 1 })],
};

/** Quick links (oval, screw gate) by their wire (mm): outside about 10 d long and 4.2 d wide, the gate's sleeve 1.7 d
 *  across and 2.5 d long; typical of makers' zinc-plated quick links, read from no source here. */
export const QUICKLINKS: Record<string, { d: number }> = Object.fromEntries([3, 3.5, 4, 5, 6, 7, 8, 10, 12].map((d) => [String(d), { d }]));
type QL = { d: number };
const qlOf = (q: QL) => ({ inL: 8 * q.d, inW: 2.2 * q.d, sleeve: 1.7 * q.d, sL: 2.5 * q.d });
const QUICKLINK: PartFamily<QL> = {
  id: 'piece.quicklink', name: 'Quick link', gloss: 'An oval screw-gate quick link by its wire (typical)', domains: RIG, aisle: 'Rigging / Shackles and links',
  says: 'An oval quick link (typical of makers\' zinc-plated links: outside about 10 d by 4.2 d): its link a run (two sides and two half bends closing on one plane) and its gate\'s sleeve slid over the middle of one side (Over a shaft; its thread not drawn: drawn closed). A chain\'s end link or an eye goes over its other side',
  rows: QUICKLINKS, size: '6', source: 'typical of makers\' quick links, read from no source here',
  recipe: (q, size) => { const p = qlOf(q), n = `${size} mm quick link`, c = { mat: STEEL, ro: mm(q.d) / 2, color: ZINC }, s = mm(p.inL - p.inW), R = mm(p.inW + q.d) / 2;
    const link = run(n, [{ name: `${n} side`, ...c, straight: s }, { name: `${n} end`, ...c, bend: 180, R }, { name: `${n} side 2`, ...c, straight: s }, { name: `${n} end 2`, ...c, bend: 180, R }]);
    return over(link, `${n} side/axis`, made(`${n} gate`, STEEL, { tube: [mm(q.d) / 2, mm(p.sleeve) / 2, mm(p.sL)] }, { color: BRIGHT }), 'mid', 'touch'); },
  expect: (q) => { const p = qlOf(q); return { bound: [mm(p.inW + q.d) + mm(q.d) / 2 + mm(p.sleeve) / 2, mm(p.inL + 2 * q.d), mm(p.sleeve)], mass: (disc(mm(q.d)) * (2 * mm(p.inL - p.inW) + Math.PI * mm(p.inW + q.d)) + annulus(mm(p.sleeve), mm(q.d)) * mm(p.sL)) * rho(STEEL), tol: 0.01, massTol: 0.02, says: 'its outside, the gate standing out of one side; nominal mass, the bent wire and its sleeve' }; },
  tests: [T(5)],
};

// ---- clips and pins --------------------------------------------------------------------------------------------
/** Ball-lock (quick-release) pins by their pin (mm): handle across D and high H, its button across and high; typical of
 *  makers' button-handle ball-lock pins, read from no source here. */
export const BALLLOCK: Record<string, { D: number; H: number; b: number; bh: number }> = {
  '5': { D: 16, H: 14, b: 6, bh: 4 }, '6': { D: 18, H: 15, b: 7, bh: 4 }, '8': { D: 22, H: 17, b: 8, bh: 5 }, '10': { D: 26, H: 19, b: 10, bh: 5 }, '12': { D: 30, H: 21, b: 12, bh: 6 }, '16': { D: 36, H: 24, b: 14, bh: 6 }, '20': { D: 42, H: 27, b: 16, bh: 7 },
};
type BL = { d: number; D: number; H: number; b: number; bh: number };
const BALLLOCKPIN: PartFamily<BL> = {
  id: 'piece.balllockpin', name: 'Ball-lock pin', gloss: 'A button-handle ball-lock (quick-release) pin by its diameter and grip (typical)', domains: FAST, aisle: 'Fasteners / Clips and pins',
  says: 'A ball-lock pin (typical of makers\' button-handle pins): its pin so long under the handle (its grip and tip), its handle and its button on top (its two locking balls near the tip not drawn: approximated). Its pin offers its axis: it goes through a clevis\'s holes (Through a line), pressed to let its balls in',
  rows: Object.fromEntries(Object.entries(BALLLOCK).map(([k, r]) => [k, { d: Number(k), ...r }])), size: '8', source: 'typical of makers\' ball-lock pins, read from no source here',
  settings: [{ key: 'length', label: 'Pin under the handle, mm', type: 'number', default: 40 }],
  cannot: (q, size, set) => above0(set, 'length', 'a length') ?? (Number(set.length) >= 2 * q.d ? null : `a ${size} mm ball-lock pin at least two diameters long under its handle (${2 * q.d} mm)`),
  recipe: (q, size, set) => { const n = `${size} mm ball-lock pin`; return stack(`${size} × ${Number(set.length)} ball-lock pin`, 1, [{ b: made(`${n} pin`, 'stainless-304', { cyl: [mm(q.d) / 2, len(set)] }) }, { b: made(`${n} handle`, 'al-6061', { cyl: [mm(q.D) / 2, mm(q.H)] }, { color: 0xb02020 }) }, { b: made(`${n} button`, 'stainless-304', { cyl: [mm(q.b) / 2, mm(q.bh)] }) }]); },
  expect: (q, _s, set) => ({ bound: [mm(q.D), len(set) + mm(q.H + q.bh), mm(q.D)], mass: (disc(mm(q.d)) * len(set) + disc(mm(q.b)) * mm(q.bh)) * rho('stainless-304') + disc(mm(q.D)) * mm(q.H) * rho('al-6061'), tol: 0.01, massTol: 0.02, says: 'its handle across by pin, handle and button; nominal mass, the solids' }),
  tests: [T(3)],
};
/** Hitch pins (in): pin and its usable length; typical of makers' tractor hitch pins, read from no source here. Its
 *  handle ring 1.5 d inside, its bar d / 2; its clip's cross hole d / 4 across, d from its end (typical). */
export const HITCHPINS: Record<string, { L: number }> = { '1/2': { L: 2.5 }, '5/8': { L: 3 }, '3/4': { L: 4 }, '7/8': { L: 4.5 }, '1': { L: 5.5 }, '1 1/4': { L: 6.5 } };
type HP = { d: number; L: number };
const HITCHPIN: PartFamily<HP> = {
  id: 'piece.hitchpin', name: 'Hitch pin', gloss: 'A ring-handle hitch pin by its pin (in, typical)', domains: ['mechanical', 'vehicles', 'everyday'], aisle: 'Fasteners / Clips and pins',
  says: 'A hitch pin (typical of makers\' tractor hitch pins): its pin, its usable length, with its clip\'s cross hole near its end (`<name> pin/cross`, along x, for an R-clip: Through a line), its collar and its handle ring standing on it (its bent handle drawn as a ring). Its pin offers its axis: it goes through a drawbar\'s and a hitch\'s holes',
  rows: Object.fromEntries(Object.entries(HITCHPINS).map(([k, r]) => [k, { d: frac(k), ...r }])), size: '5/8', source: 'typical of makers\' hitch pins, read from no source here',
  recipe: (q, size) => { const n = `${size} hitch`, L = inch(q.L + q.d);
    return stack(`${size} × ${q.L} in hitch pin`, 1, [{ b: made(`${n} pin`, ALLOY, { cyl: [inch(q.d) / 2, L] }, { color: ZINC, pattern: { name: 'cross', points: [[-L / 2 + inch(0.75 * q.d), 0]], hole: inch(q.d) / 8, face: '+x' } }) }, { b: made(`${n} collar`, ALLOY, { cyl: [inch(0.75 * q.d), inch(q.d / 2)] }, { color: ZINC }) }, { b: eyeOf(`${n} handle`, ALLOY, inch(1.5 * q.d), inch(2.5 * q.d)) }]); },
  expect: (q) => { const L = inch(q.L + q.d); return { bound: [inch(2.5 * q.d), L + inch(q.d / 2 + 2.5 * q.d), inch(1.5 * q.d)], mass: (disc(inch(q.d)) * L - disc(inch(q.d / 4)) * inch(q.d) + disc(inch(1.5 * q.d)) * inch(q.d / 2) + torusVol(inch(q.d), inch(q.d / 4))) * rho(ALLOY), tol: 0.01, massTol: 0.02, says: 'its ring across by pin (its usable length and d below its cross hole), collar and ring; nominal mass, less its cross hole (drawn as a cylinder its pin across)' }; },
  tests: [T(4, { offers: ['5/8 hitch collar/axis', '5/8 hitch pin/axis', '5/8 hitch pin/cross'] })],
};
/** E-clips (retaining washers for shafts), DIN 6799 (mm): groove d2, outside d3, thickness s, shafts from–to. Recalled
 *  from makers' tables, read from no source here (typical). */
export const DIN6799: Record<string, { d3: number; s: number; shaft: [number, number] }> = {
  '1.2': { d3: 3, s: 0.3, shaft: [1.4, 2] }, '1.5': { d3: 4, s: 0.4, shaft: [2, 2.5] }, '1.9': { d3: 4.5, s: 0.5, shaft: [2.5, 3] }, '2.3': { d3: 6, s: 0.6, shaft: [3, 4] },
  '3.2': { d3: 7, s: 0.6, shaft: [4, 5] }, '4': { d3: 9, s: 0.7, shaft: [5, 7] }, '5': { d3: 11, s: 0.7, shaft: [6, 8] }, '6': { d3: 12, s: 0.7, shaft: [7, 9] },
  '7': { d3: 14, s: 0.9, shaft: [8, 11] }, '8': { d3: 16, s: 1, shaft: [9, 12] }, '9': { d3: 18.5, s: 1.1, shaft: [10, 14] }, '10': { d3: 20, s: 1.2, shaft: [11, 15] },
  '12': { d3: 23, s: 1.3, shaft: [13, 18] }, '15': { d3: 29, s: 1.5, shaft: [16, 24] }, '19': { d3: 37, s: 1.75, shaft: [20, 31] }, '24': { d3: 44, s: 2, shaft: [25, 38] },
};
type EClip = { d2: number; d3: number; s: number; shaft: [number, number] };
const ECLIP: PartFamily<EClip> = {
  id: 'piece.eclip', name: 'E-clip', gloss: 'An E-clip (retaining washer, DIN 6799) by the groove it sits in', domains: FAST, aisle: 'Fasteners / Clips and pins',
  says: 'An E-clip (DIN 6799; typical) by its groove\'s diameter, for the shafts its row says: drawn as a closed ring of its groove\'s inside and its outside (its open side and its three lugs not drawn: approximated). It slides over a shaft (Over a shaft) into its groove, pushed on from the side in life',
  rows: Object.fromEntries(Object.entries(DIN6799).map(([k, r]) => [k, { d2: Number(k), ...r }])), size: '4', source: 'DIN 6799, recalled from makers\' tables, read from no source here (typical)',
  recipe: (q, size) => made(`${size} mm E-clip (shafts ${q.shaft[0]}–${q.shaft[1]} mm)`, 'steel-spring', { tube: [mm(q.d2) / 2, mm(q.d3) / 2, mm(q.s)] }, { color: DARK }),
  expect: (q) => ({ bound: [mm(q.d3), mm(q.s), mm(q.d3)], mass: annulus(mm(q.d3), mm(q.d2)) * mm(q.s) * rho('steel-spring'), tol: 0.01, massTol: 0.02, says: 'its outside by its thickness; nominal mass, the closed ring' }),
  tests: [T(1)],
};
/** Spring cotters (R-clips), DIN 11024 (mm): wire d, length l, the pins it is for from–to. Recalled from makers'
 *  tables, read from no source here (typical). */
export const DIN11024: Record<string, { l: number; pin: [number, number] }> = {
  '1': { l: 22, pin: [3, 4.5] }, '1.6': { l: 30, pin: [5, 7] }, '2': { l: 38, pin: [7, 9] }, '2.5': { l: 44, pin: [9, 12] }, '3.2': { l: 60, pin: [12, 18] }, '4': { l: 70, pin: [18, 22] }, '5': { l: 90, pin: [22, 28] },
};
type RClip = { d: number; l: number; pin: [number, number] };
const RCLIP: PartFamily<RClip> = {
  id: 'piece.rclip', name: 'R-clip', gloss: 'A spring cotter (R-clip, hairpin, DIN 11024) by its wire', domains: FAST, aisle: 'Fasteners / Clips and pins',
  says: 'An R-clip (spring cotter, DIN 11024; typical) by its wire, for the pins its row says: drawn as a hairpin run (its straight leg, a half bend round the largest pin it takes, its other leg drawn straight: its wave not drawn). Its straight leg offers its axis (`<name> leg 1/axis`): it goes through a pin\'s cross hole (Through a line)',
  rows: Object.fromEntries(Object.entries(DIN11024).map(([k, r]) => [k, { d: Number(k), ...r }])), size: '2', source: 'DIN 11024, recalled from makers\' tables, read from no source here (typical)',
  recipe: (q, size) => uOf(`${size} mm R-clip`, 'steel-spring', mm(q.d), mm(q.pin[1]), mm(q.l - q.pin[1] / 2 - q.d), DARK),
  expect: (q) => ({ bound: [mm(q.pin[1] + 2 * q.d), mm(q.l), mm(q.d)], mass: uVol(mm(q.d), mm(q.pin[1]), mm(q.l - q.pin[1] / 2 - q.d)) * rho('steel-spring'), tol: 0.01, massTol: 0.02, says: 'its bow across (the largest pin and its wire) by its length; nominal mass, the bent wire' }),
  tests: [T(3)],
};

// ---- thumb and wing screws --------------------------------------------------------------------------------------
/** Knurled thumb screws (mm): DIN 464 (high head with a collar) [dk, k, collar ds, collar c] and DIN 653 (low head) [dk,
 *  k]. Recalled from makers' tables, read from no source here (typical). */
export const DIN464: Record<string, { dk: number; k: number; ds: number; c: number; low: number }> = {
  M3: { dk: 12, k: 7.5, ds: 6, c: 2.5, low: 2.5 }, M4: { dk: 16, k: 8.5, ds: 8, c: 3.5, low: 3.5 }, M5: { dk: 20, k: 9.5, ds: 10, c: 4, low: 4 }, M6: { dk: 24, k: 12, ds: 12, c: 5, low: 5 },
  M8: { dk: 30, k: 15, ds: 16, c: 6, low: 6 }, M10: { dk: 36, k: 18, ds: 20, c: 8, low: 8 },
};
type Thumb = { d: number; dk: number; k: number; ds: number; c: number; low: number };
const THUMB_ROWS: Record<string, Thumb> = Object.fromEntries(Object.entries(DIN464).map(([k, r]) => [k, { d: METRIC[k]!.d, ...r }]));
const thumb = (id: string, std: string, high: boolean): PartFamily<Thumb> => ({
  id, name: `Knurled thumb screw (${std})`, gloss: `A knurled thumb screw, ${high ? 'high head with a collar' : 'low head'} (${std}), by its size and length`, domains: FAST, aisle: 'Fasteners / Thumb and wing screws',
  says: `A knurled thumb screw (${std}; typical): its shank${high ? ', its collar' : ''} and its knurled head on top, turned by hand (the knurl and thread not drawn). Its shank offers its axis; it goes down a tapped hole (Through a line)`,
  rows: THUMB_ROWS, size: 'M5', source: `${std}, recalled from makers' tables, read from no source here (typical)`,
  settings: [{ key: 'length', label: 'Length under the head, mm', type: 'number', default: 12 }, { key: 'matter', label: 'Made of', type: 'choice', default: 'steel', choices: ['steel', 'stainless', 'brass'] }],
  cannot: (_q, _s, set) => above0(set, 'length', 'a length'),
  recipe: (q, size, set) => { const m = set.matter === 'stainless' ? 'stainless-304' : set.matter === 'brass' ? 'brass' : STEEL, n = `${size} thumb screw ${std}`;
    return stack(`${size} × ${Number(set.length)} ${n}`, 1, [{ b: made(`${n} shank`, m, { cyl: [mm(q.d) / 2, len(set)] }) }, ...(high ? [{ b: made(`${n} collar`, m, { cyl: [mm(q.ds) / 2, mm(q.c)] }) }] : []), { b: made(`${n} head`, m, { cyl: [mm(q.dk) / 2, mm(high ? q.k : q.low)] }) }]); },
  expect: (q, _s, set) => { const m = set.matter === 'stainless' ? 'stainless-304' : set.matter === 'brass' ? 'brass' : STEEL, H = mm(high ? q.k + q.c : q.low);
    return { bound: [mm(q.dk), len(set) + H, mm(q.dk)], mass: (disc(mm(q.d)) * len(set) + (high ? disc(mm(q.ds)) * mm(q.c) : 0) + disc(mm(q.dk)) * mm(high ? q.k : q.low)) * rho(m), tol: 0.01, massTol: 0.02, says: 'its head across by its length and head; nominal mass, the solids' }; },
  tests: [T(high ? 3 : 2)],
});
const THUMB464 = thumb('piece.thumbscrew', 'DIN 464', true), THUMB653 = thumb('piece.thumbscrewlow', 'DIN 653', false);
/** Wing screws, DIN 316 (mm): wings tip to tip e, their height h. Recalled from makers' tables, read from no source here
 *  (typical); the hub 2 d across and each wing 0.35 d + 1 thick, typical. */
export const DIN316: Record<string, { e: number; h: number }> = { M4: { e: 20, h: 10.5 }, M5: { e: 26, h: 13 }, M6: { e: 33, h: 17 }, M8: { e: 39, h: 20 }, M10: { e: 51, h: 25 }, M12: { e: 65, h: 33.5 } };
type WingS = { d: number; e: number; h: number };
const wingW = (q: WingS) => ({ lw: (q.e - 2 * q.d) / 2, tw: 0.35 * q.d + 1 });
const WINGSCREW: PartFamily<WingS> = {
  id: 'piece.wingscrew', name: 'Wing screw', gloss: 'A wing screw (DIN 316) by its size and length', domains: FAST, aisle: 'Fasteners / Thumb and wing screws',
  says: 'A wing screw (DIN 316; typical): its shank and its head, a round hub with a wing each side (drawn flat, not curved). Its shank offers its axis; it goes down a tapped hole (Through a line) and is turned by hand',
  rows: Object.fromEntries(Object.entries(DIN316).map(([k, r]) => [k, { d: METRIC[k]!.d, ...r }])), size: 'M6', source: 'DIN 316, recalled from makers\' tables, read from no source here (typical)',
  settings: [{ key: 'length', label: 'Length under the head, mm', type: 'number', default: 16 }],
  cannot: (_q, _s, set) => above0(set, 'length', 'a length'),
  recipe: (q, size, set) => { const w = wingW(q), n = `${size} wing screw`, wing = (i: number) => made(`${n} wing ${i}`, STEEL, { box: [mm(w.lw), mm(q.h), mm(w.tw)] }, { color: ZINC });
    const head = stack(`${n} head`, 0, [{ b: wing(1) }, { b: made(`${n} hub`, STEEL, { cyl: [mm(q.d), mm(q.h)] }, { color: ZINC }) }, { b: wing(2) }]);
    return stack(`${size} × ${Number(set.length)} wing screw`, 1, [{ b: made(`${n} shank`, STEEL, { cyl: [mm(q.d) / 2, len(set)] }, { color: ZINC }) }, { b: head }]); },
  expect: (q, _s, set) => { const w = wingW(q); return { bound: [mm(q.e), len(set) + mm(q.h), mm(2 * q.d)], mass: (disc(mm(q.d)) * len(set) + disc(mm(2 * q.d)) * mm(q.h) + 2 * mm(w.lw) * mm(q.h) * mm(w.tw)) * rho(STEEL), tol: 0.01, massTol: 0.02, says: 'tip to tip by its length and head, its hub; nominal mass, shank, hub and wings' }; },
  tests: [T(4)],
};

// ---- self-clinching (press-in) nuts and studs, typical of makers' tables ---------------------------------------------
/** Self-clinching nuts (mm): the hole they press into (their shank), shank length (code 1), collar across and height.
 *  Typical of makers' tables (PEM S and CLS types), recalled, read from no source here. */
export const PRESSNUTS: Record<string, { hole: number; A: number; E: number; T: number }> = {
  'M2.5': { hole: 4.22, A: 1.38, E: 6.35, T: 1.5 }, M3: { hole: 4.22, A: 1.38, E: 6.35, T: 1.5 }, 'M3.5': { hole: 4.75, A: 1.38, E: 7.11, T: 1.5 }, M4: { hole: 5.41, A: 1.38, E: 7.92, T: 2 },
  M5: { hole: 6.35, A: 1.38, E: 8.75, T: 2 }, M6: { hole: 8.75, A: 1.38, E: 11.05, T: 4.08 }, M8: { hole: 10.5, A: 1.38, E: 12.65, T: 5.47 },
};
type PNut = { d: number; hole: number; A: number; E: number; T: number };
const PRESSNUT: PartFamily<PNut> = {
  id: 'piece.pressnut', name: 'Self-clinching nut', gloss: 'A self-clinching (press-in) nut for sheet metal by its thread (typical of makers\' tables)', domains: FAST, aisle: 'Fasteners / Press-in',
  says: 'A self-clinching nut (typical of makers\' S and CLS tables, its code-1 shank for sheet from about 1.4 mm): its shank, that is pressed into a punched hole of its size, and its collar above, both bored at the thread\'s size (the thread and the clinch ring not drawn). Its shank goes down the sheet\'s hole (Through a line); a screw then goes up into it',
  rows: Object.fromEntries(Object.entries(PRESSNUTS).map(([k, r]) => [k, { d: METRIC[k]!.d, ...r }])), size: 'M4', source: 'typical of makers\' self-clinching nut tables (PEM S, CLS), recalled, read from no source here',
  recipe: (q, size) => stack(`${size} self-clinching nut`, 1, [{ b: made(`${size} clinch nut shank`, STEEL, { tube: [mm(q.d) / 2, mm(q.hole) / 2, mm(q.A)] }, { color: ZINC, tapped: true }) }, { b: made(`${size} clinch nut collar`, STEEL, { tube: [mm(q.d) / 2, mm(q.E) / 2, mm(q.T)] }, { color: ZINC, tapped: true }) }]),
  expect: (q) => ({ bound: [mm(q.E), mm(q.A + q.T), mm(q.E)], mass: (annulus(mm(q.hole), mm(q.d)) * mm(q.A) + annulus(mm(q.E), mm(q.d)) * mm(q.T)) * rho(STEEL), tol: 0.01, massTol: 0.02, says: 'its collar across by shank and collar; nominal mass, both less their bore' }),
  tests: [T(2, { offers: ['M4 clinch nut collar/axis', 'M4 clinch nut shank/axis'] })],
};
/** Self-clinching studs (mm): head across and height. Typical of makers' tables (PEM FH), recalled, read from no source here. */
export const PRESSSTUDS: Record<string, { H: number; T: number }> = { 'M2.5': { H: 4.1, T: 1.1 }, M3: { H: 4.6, T: 1.1 }, 'M3.5': { H: 5.3, T: 1.1 }, M4: { H: 5.9, T: 1.5 }, M5: { H: 6.9, T: 1.5 }, M6: { H: 8.2, T: 1.5 }, M8: { H: 9.6, T: 2 } };
type PStud = { d: number; H: number; T: number };
const PRESSSTUD: PartFamily<PStud> = {
  id: 'piece.pressstud', name: 'Self-clinching stud', gloss: 'A self-clinching (press-in) threaded stud for sheet metal by its thread and length (typical)', domains: FAST, aisle: 'Fasteners / Press-in',
  says: 'A self-clinching stud (typical of makers\' FH tables): its flush head, pressed into a hole of the thread\'s size in sheet, and its threaded shank standing out (the thread and serrations not drawn). Its shank offers its axis: a part and a nut go over it (Over a shaft)',
  rows: Object.fromEntries(Object.entries(PRESSSTUDS).map(([k, r]) => [k, { d: METRIC[k]!.d, ...r }])), size: 'M4', source: 'typical of makers\' self-clinching stud tables (PEM FH), recalled, read from no source here',
  settings: [{ key: 'length', label: 'Length under the head, mm', type: 'number', default: 12 }],
  cannot: (_q, _s, set) => above0(set, 'length', 'a length'),
  recipe: (q, size, set) => stack(`${size} × ${Number(set.length)} self-clinching stud`, 1, [{ b: made(`${size} clinch stud head`, STEEL, { cyl: [mm(q.H) / 2, mm(q.T)] }, { color: ZINC }) }, { b: made(`${size} clinch stud shank`, STEEL, { cyl: [mm(q.d) / 2, len(set)] }, { color: ZINC }) }]),
  expect: (q, _s, set) => ({ bound: [mm(q.H), mm(q.T) + len(set), mm(q.H)], mass: (disc(mm(q.H)) * mm(q.T) + disc(mm(q.d)) * len(set)) * rho(STEEL), tol: 0.01, massTol: 0.02, says: 'its head across by head and shank; nominal mass, the solids' }),
  tests: [T(2)],
};

// ---- turnbuckles, wire rope clips -------------------------------------------------------------------------------
/** Turnbuckles, DIN 1480 eye-to-eye (open body): its thread and the body's length between its bosses' outsides l (mm,
 *  recalled, typical); the rest in proportion to the thread, typical. */
export const DIN1480: Record<string, { l: number }> = { M6: { l: 110 }, M8: { l: 110 }, M10: { l: 125 }, M12: { l: 125 }, M16: { l: 170 }, M20: { l: 200 }, M24: { l: 255 } };
type Tb = { d: number; l: number };
const tbOf = (q: Tb) => { const d = q.d; return { boss: 1.8 * d, bossL: 1.5 * d, win: q.l - 3 * d, bar: 0.7 * d, deep: 1.2 * d, gap: 1.4 * d, rod: 3 * d, eyeIn: 1.6 * d, eyeOut: 3.2 * d }; };
const TURNBUCKLE: PartFamily<Tb> = {
  id: 'piece.turnbuckle', name: 'Turnbuckle', gloss: 'An open-body eye-to-eye turnbuckle (DIN 1480) by its thread', domains: RIG, aisle: 'Rigging / Turnbuckles',
  says: 'An open-body turnbuckle, eye to eye (DIN 1480; its body length recalled, the rest in proportion to its thread, typical): its body, two bosses and the two side bars between them (a ring of two), and an eye end at each boss, its rod and its eye (drawn screwed out to its boss: each rod stands on its boss, its thread inside the boss not drawn). Its eyes take a shackle\'s pin or a rope\'s thimble; turned, it draws them together',
  rows: Object.fromEntries(Object.entries(DIN1480).map(([k, r]) => [k, { d: METRIC[k]!.d, ...r }])), size: 'M10', source: 'DIN 1480 body lengths, recalled from makers\' tables, read from no source here (typical); its other sizes in proportion, typical',
  recipe: (q, size) => { const p = tbOf(q), n = `${size} turnbuckle`, boss = (i: number) => made(`${n} boss ${i}`, 'steel-low', { tube: [mm(q.d) / 2, mm(p.boss) / 2, mm(p.bossL)] }, { color: ZINC, tapped: true });
    const bars = ring(`${n} body bars`, made(`${n} side bar`, 'steel-low', { box: [mm(p.bar), mm(p.win), mm(p.deep)] }, { color: ZINC }), 2, mm(p.gap + p.bar) / 2);
    const end = (i: number, up: boolean) => { const rod = made(`${n} eye end ${i} rod`, ALLOY, { cyl: [mm(q.d) / 2, mm(p.rod)] }, { color: BRIGHT }), eye = eyeOf(`${n} eye end ${i} eye`, ALLOY, mm(p.eyeIn), mm(p.eyeOut));
      return up ? [{ b: rod }, { b: eye }] : [{ b: eye }, { b: rod }]; };
    return stack(`${size} turnbuckle, eye to eye`, 1, [...end(1, false), { b: boss(1) }, { b: bars }, { b: boss(2) }, ...end(2, true)]); },
  expect: (q) => { const p = tbOf(q), eyeVolT = torusVol(mm(p.eyeIn + p.eyeOut) / 4, mm(p.eyeOut - p.eyeIn) / 4);
    return { /* bound not held since root 1 (2026-11-07): the solids rest where they first touch (the eye into the boss's bore edge, the eye bolts into the bosses, the U-bolt legs down the holes), so the row's stacked height no longer applies; the physical height is not yet derived: plan/FIX-PLAN.md */ mass: (2 * annulus(mm(p.boss), mm(q.d)) * mm(p.bossL) + 2 * mm(p.bar) * mm(p.win) * mm(p.deep)) * rho('steel-low') + 2 * (disc(mm(q.d)) * mm(p.rod) + eyeVolT) * rho(ALLOY), tol: 0.01, massTol: 0.02, says: 'its body (l) and its two eye ends end to end; nominal mass, the solids' }; },
  tests: [T(10)],
};
/** Wire rope clips (in): the rope, its U-bolt's bar, and the fewest clips a termination takes. Recalled from makers'
 *  tables of US federal FF-C-450, read from no source here (typical); the saddle in proportion, typical. */
export const ROPECLIPS: Record<string, { u: number; clips: number }> = {
  '1/8': { u: 0.22, clips: 2 }, '3/16': { u: 0.25, clips: 2 }, '1/4': { u: 0.31, clips: 2 }, '5/16': { u: 0.38, clips: 2 }, '3/8': { u: 0.44, clips: 2 }, '7/16': { u: 0.5, clips: 2 },
  '1/2': { u: 0.5, clips: 3 }, '9/16': { u: 0.56, clips: 3 }, '5/8': { u: 0.56, clips: 3 }, '3/4': { u: 0.63, clips: 4 }, '7/8': { u: 0.75, clips: 4 }, '1': { u: 0.75, clips: 5 },
};
type Rc = { rope: number; u: number; clips: number };
const rcOf = (q: Rc) => ({ inside: q.rope * 1.15, leg: q.rope * 1.6 + 2 * q.u, sw: q.rope * 1.15 + 4 * q.u, sh: q.u, sd: 2.2 * q.u });
const ROPECLIP: PartFamily<Rc> = {
  id: 'piece.ropeclip', name: 'Wire rope clip', gloss: 'A U-bolt wire rope clip by its rope (in), the fewest clips said', domains: RIG, aisle: 'Rigging / Wire rope fittings',
  says: 'A U-bolt wire rope clip by its rope (in; its U-bolt\'s bar and the fewest clips a termination takes recalled, typical; its saddle in proportion, typical): its U-bolt (a run: a leg, a half bend round the rope, a leg) standing on its saddle, the saddle\'s two holes under the legs (`<name> saddle/legs`; the legs drawn ending on the saddle, not through it, and its nuts not drawn). The rope lies in its bow; the U-bolt\'s bow goes on the dead end',
  rows: Object.fromEntries(Object.entries(ROPECLIPS).map(([k, r]) => [k, { rope: frac(k), ...r }])), size: '3/8', source: 'US federal FF-C-450 sizes, recalled from makers\' tables, read from no source here (typical)',
  recipe: (q, size) => { const p = rcOf(q), n = `${size} rope clip`, c = (p.inside + q.u) / 2;
    const saddle = made(`${n} saddle`, 'cast-iron', { box: [inch(p.sw), inch(p.sh), inch(p.sd)] }, { color: 0x7a7c80, pattern: { name: 'legs', points: [[-inch(c), 0], [inch(c), 0]], hole: inch(q.u) / 2 } });
    return stack(`${size} in wire rope clip (${q.clips} for a termination)`, 1, [{ b: saddle }, { b: uOf(n, STEEL, inch(q.u), inch(p.inside), inch(p.leg)) }]); },
  expect: (q) => { const p = rcOf(q); return { /* bound not held since root 1 (2026-11-07): the solids rest where they first touch (the eye into the boss's bore edge, the eye bolts into the bosses, the U-bolt legs down the holes), so the row's stacked height no longer applies; the physical height is not yet derived: plan/FIX-PLAN.md */ mass: (inch(p.sw) * inch(p.sh) * inch(p.sd) - 2 * disc(inch(q.u)) * inch(p.sh)) * rho('cast-iron') + uVol(inch(q.u), inch(p.inside), inch(p.leg)) * rho(STEEL), tol: 0.01, massTol: 0.02, says: 'its saddle across by saddle and U-bolt; nominal mass, the saddle less its holes and the bent bar' }; },
  tests: [T(4, { offers: ['3/8 rope clip leg 1/axis', '3/8 rope clip leg 2/axis', '3/8 rope clip saddle/legs'] })],
};

// ---- hinges ----------------------------------------------------------------------------------------------------
/** Strap and T-hinges (in): leaf length, leaf's width at the knuckle, its thickness and knuckle; typical of makers'
 *  light strap hinges, read from no source here. */
export const STRAPS: Record<string, { L: number; w: number; t: number; k: number }> = {
  '3': { L: 3, w: 0.75, t: 0.06, k: 0.22 }, '4': { L: 4, w: 0.875, t: 0.06, k: 0.25 }, '5': { L: 5, w: 1, t: 0.075, k: 0.28 }, '6': { L: 6, w: 1.125, t: 0.075, k: 0.31 },
  '8': { L: 8, w: 1.25, t: 0.09, k: 0.34 }, '10': { L: 10, w: 1.375, t: 0.1, k: 0.38 }, '12': { L: 12, w: 1.5, t: 0.12, k: 0.41 },
};
type Strap = { L: number; w: number; t: number; k: number };
const hingeOf = (q: Strap, size: string, tee: boolean): Block => { const n = `${size} in ${tee ? 'T-' : 'strap '}hinge`, holes = (L: number) => ({ name: 'screw holes', points: [[-inch(L) / 4, 0], [inch(L) / 4, 0]] as [number, number][], hole: inch(0.08) });
  const leaf = (i: number, L: number, w: number) => made(`${n} leaf ${i}`, STEEL, { box: [inch(L), inch(q.t), inch(w)] }, { color: 0x333333, pattern: holes(L) });
  const knuckle = turn(made(`${n} knuckle`, STEEL, { cyl: [inch(q.k) / 2, inch(tee ? 2 * q.w : q.w)] }, { color: 0x333333 }), 0, 90);
  return stack(n, 0, [{ b: tee ? leaf(1, q.w, 2 * q.w) : leaf(1, q.L, q.w) }, { b: knuckle }, { b: leaf(2, q.L, q.w) }]); };
const hingeFam = (tee: boolean): PartFamily<Strap> => ({
  id: tee ? 'piece.thinge' : 'piece.straphinge', name: tee ? 'T-hinge' : 'Strap hinge', gloss: `A ${tee ? 'T-hinge (one strap, one short wide leaf)' : 'strap hinge (two straps)'} by its strap's length (in, typical)`, domains: ['mechanical', 'structural', 'everyday'], aisle: 'Hardware / Hinges and latches',
  says: `A ${tee ? 'T-hinge' : 'strap hinge'} (typical of makers' light hinges): ${tee ? 'its short wide leaf, its knuckle and its strap' : 'two straps either side of its knuckle'}, laid flat in a row (its straps drawn straight, not tapered; two screw holes a leaf, \`<name> leaf 1/screw holes\`). Its knuckle offers its axis, across, its pin's line (a hinge on that line in the physics)`,
  rows: STRAPS, size: '4', source: 'typical of makers\' light strap and T-hinges, read from no source here',
  recipe: (q, size) => hingeOf(q, size, tee),
  expect: (q) => { const a = tee ? q.w : q.L, wA = tee ? 2 * q.w : q.w, kL = tee ? 2 * q.w : q.w;
    return { bound: [inch(a + q.k + q.L), inch(q.k), inch(Math.max(wA, kL))], mass: (inch(a) * inch(q.t) * inch(wA) + inch(q.L) * inch(q.t) * inch(q.w) - 4 * disc(inch(0.16)) * inch(q.t) + disc(inch(q.k)) * inch(kL)) * rho(STEEL), tol: 0.01, massTol: 0.02, says: 'its leaves and knuckle end to end by its knuckle; nominal mass, the leaves less their holes and the knuckle' }; },
  tests: [T(3)],
});
const STRAPHINGE = hingeFam(false), THINGE = hingeFam(true);
/** Concealed cup hinges by their cup (mm): cup across, its depth, the arm's length, width and height; typical of
 *  makers' 35 mm (and 26 and 40 mm) cup hinges, read from no source here. */
export const CUPHINGES: Record<string, { D: number; depth: number; flange: number; arm: number; aw: number; ah: number }> = {
  '26': { D: 26, depth: 11, flange: 1.2, arm: 40, aw: 13, ah: 9 }, '35': { D: 35, depth: 11.5, flange: 1.5, arm: 50, aw: 17, ah: 11 }, '40': { D: 40, depth: 13, flange: 1.5, arm: 55, aw: 19, ah: 12 },
};
type Cup = { D: number; depth: number; flange: number; arm: number; aw: number; ah: number };
const CUPHINGE: PartFamily<Cup> = {
  id: 'piece.cuphinge', name: 'Concealed cup hinge', gloss: 'A concealed (European) cabinet hinge by its cup, 35 mm the usual (typical)', domains: ['structural', 'everyday', 'mechanical'], aisle: 'Hardware / Hinges and latches',
  says: 'A concealed cabinet hinge (typical of makers\' 35 mm cup hinges; 26 and 40 mm cups too): its cup, that sits in a blind hole of its diameter bored in the door (`<name> cup/cavity`), and its arm beside it, that goes to a mounting plate on the cabinet\'s side (its knuckles, spring and plate not drawn: the arm drawn as a bar). The cup goes into a door\'s bore (Into a room, the other way about: a hole of its size)',
  rows: CUPHINGES, size: '35', source: 'typical of makers\' concealed cup hinges, read from no source here',
  recipe: (q, size) => stack(`${size} mm cup hinge`, 0, [{ b: made(`${size} mm hinge cup`, 'steel-low', { cup: [mm(q.D) / 2, mm(q.depth), mm(q.flange), mm(q.flange)] }, { color: BRIGHT }) }, { b: made(`${size} mm hinge arm`, 'steel-low', { box: [mm(q.arm), mm(q.ah), mm(q.aw)] }, { color: BRIGHT }) }], undefined, false, 'hi'),
  expect: (q) => ({ bound: [mm(q.D + q.arm), mm(Math.max(q.depth, q.ah)), mm(Math.max(q.D, q.aw))], mass: ((disc(mm(q.D)) - disc(mm(q.D - 2 * q.flange))) * mm(q.depth) + disc(mm(q.D - 2 * q.flange)) * mm(q.flange) + mm(q.arm) * mm(q.ah) * mm(q.aw)) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its cup and arm side by side; nominal mass, the cup\'s wall and floor and the arm (a solid bar)' }),
  tests: [T(2)],
};

// ---- the tables' sources and what they are ----------------------------------------------------------------------
/** Where each table's figures come from. */
export const FIXINGS_SOURCES: Record<string, string> = {
  UTS_NOMINAL: 'BOSL2 screws.scad (BSD-2): #N as 0.060 + 0.013 N in', UTS_THREAD: 'BOSL2 screws.scad UTS_thread (BSD-2)', UTS_HEX: 'BOSL2 screws.scad UTS_hex (BSD-2), ASME B18.2.1',
  UTS_BUTTON: 'BOSL2 screws.scad UTS_button (BSD-2), ASME B18.3', UTS_PAN: 'BOSL2 screws.scad UTS_pan (BSD-2), ASME B18.6.3', UTS_FILLISTER: 'BOSL2 screws.scad UTS_fillister (BSD-2), ASME B18.6.3',
  UTS_NUT_SMALL: 'BOSL2 screws.scad _nut_info_english (BSD-2), ASME B18.2.2 Table A-1', UTS_NUT_THIN: 'BOSL2 screws.scad _nut_info_english thin (BSD-2), ASME B18.2.2', UTS_NUT_THICK: 'BOSL2 screws.scad _nut_info_english thick (BSD-2), ASME B18.2.2',
  B183_SOURCE: 'bd_warehouse socket_head_cap_parameters.csv, asme_b18.3 columns (Apache-2.0)', SETSCREW_SOURCE: 'bd_warehouse imperial_set_screw_parameters.csv (Apache-2.0)',
  B1822: 'ASME B18.22.1 Type A N and W, recalled from makers\' tables, read from no source here (typical)', B1821: 'ASME B18.21.1 regular, recalled from makers\' tables, read from no source here (typical)',
  ISO1478: 'ISO 1478 d1 max and C point length, recalled, read from no source here (typical)', TAPPING_HEADS: 'ISO 7049, 7050, 1481 and 1479 heads, recalled from makers\' tables, read from no source here (typical)',
  DIN580: 'DIN 580, recalled from makers\' tables (typical)', DIN3570: 'DIN 3570 A, recalled from makers\' tables (typical)', SHACKLES: 'RR-C-271 sizes, recalled from makers\' tables (typical)',
  DIN766: 'DIN 766, recalled from makers\' tables (typical)', DIN6799: 'DIN 6799, recalled from makers\' tables (typical)', DIN11024: 'DIN 11024, recalled from makers\' tables (typical)',
  DIN464: 'DIN 464 and DIN 653, recalled from makers\' tables (typical)', DIN316: 'DIN 316, recalled from makers\' tables (typical)', PRESSNUTS: 'typical of PEM S and CLS tables, recalled', PRESSSTUDS: 'typical of PEM FH tables, recalled',
  DIN1480: 'DIN 1480 body lengths, recalled (typical)', ROPECLIPS: 'FF-C-450 sizes, recalled from makers\' tables (typical)', STRAPS: 'typical of makers\' light strap hinges', CUPHINGES: 'typical of makers\' cup hinges',
  QUICKLINKS: 'typical of makers\' quick links', BALLLOCK: 'typical of makers\' ball-lock pins', HITCHPINS: 'typical of makers\' hitch pins',
};
const COPIED = ['UTS_NOMINAL', 'UTS_THREAD', 'UTS_HEX', 'UTS_BUTTON', 'UTS_PAN', 'UTS_FILLISTER', 'UTS_NUT_SMALL', 'UTS_NUT_THIN', 'UTS_NUT_THICK', 'B183_SOURCE', 'SETSCREW_SOURCE'];
/** What each table's figures are (src/nexus/evidence.ts): the copied tables specified; the rest, recalled and labelled typical, estimated. */
export const FIXINGS_STATUS: Record<string, string> = Object.fromEntries(Object.keys(FIXINGS_SOURCES).map((k) => [k, COPIED.includes(k) ? 'specified' : 'estimated']));

/** Every family of fixings and rigging this file makes, most used first. */
export const FIXINGS = [INCHBOLT, INCHNUT, SAE, USS, INCHSHCS, INCHLOCK, INCHSET, INCHBUTTON, INCHPAN, INCHFILL, INCHJAM, INCHTHICK, INCHSQUARE,
  TAPPAN, TAPCSK, TAPHEX, TAPSLOT, STUD938, STUD939, STUD835, EYEBOLT, EYENUT, UBOLT, SHACKLE, QUICKLINK, TURNBUCKLE, ROPECLIP, CHAIN,
  ECLIP, RCLIP, HITCHPIN, BALLLOCKPIN, THUMB464, THUMB653, WINGSCREW, PRESSNUT, PRESSSTUD, STRAPHINGE, THINGE, CUPHINGE] as PartFamily<unknown>[];
/** Their piece nodes (registered with the maker's check.row by familyNode). */
export const FIXINGS_NODES: BlockDef[] = FIXINGS.map((f) => familyNode(f));
