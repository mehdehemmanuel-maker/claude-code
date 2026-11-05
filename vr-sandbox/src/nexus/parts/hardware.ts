// Fasteners and hardware made by the table-driven maker (decision 0026, step 2): countersunk, button, pan head and wood
// screws, threaded rod and its nuts, flange, nyloc, square, wing and T-slot nuts, blind rivets, split and clevis pins,
// spring washers, heat-set inserts, hex standoffs, NdFeB magnets, pull handles, star knobs, bumpers and rubber feet,
// drawer slides, gas struts, piano hinges and cable ties. Each a table of rows and one recipe of the room operations
// (src/nexus/room.ts): no place is written here, every place is what an operation gives.
//
// Some tables here are copied from bd_warehouse (https://github.com/gumyr/bd_warehouse, src/bd_warehouse/data/*.csv,
// read 2026-11-05) with its licence notice kept, as decision 0026 allows for permissive files:
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
// Copied (changes: the coarse-pitch row of each size picked out of the CSV and written as a row; values mm, as the CSV
// gives them; a row the CSV holds twice kept once): DIN1665 (hex_nut_with_flange_parameters.csv), DIN557 (square_nut_parameters.csv), ISO14583
// (pan_head_parameters.csv, its iso14583 columns: the head ISO 7045's cross-recessed pan head shares), HEATSET
// (heatset_nut_parameters.csv, each maker's own row: McMaster-Carr, Hilitchi, AE-SamZhihui). The countersunk (ISO 10642)
// and button head (ISO 7380-1) rows are bd_warehouse's too, read from src/nexus/parts/bdw.ts.
//
// The rest are not copied: written from recall of makers' tables of the standard, read from no source here and so
// labelled typical (ISO 7040 nyloc heights, ISO 1234 split pins, ISO 2341 clevis pins), or from this repository's own kinds (src/nexus/kinds: DIN 127 B spring washers, DIN 6336
// star knobs, the rivet lengths, the gas spring sizes, the cable tie sizes), or typical of what makers sell (wood screws,
// wing nuts, T-slot nuts, rivet heads, standoffs, magnets, handles, bumpers, feet, slides, piano hinges): each table says
// which, in HARDWARE_SOURCES and HARDWARE_STATUS. None was cross-checked against the copyleft tables (FreeCAD Fasteners,
// NopSCADlib): left open. Threads are never drawn: a tapped hole or a nut's bore is drawn at the thread's size.

import { made, over, stack, through, turn, onto } from '../room';
import { METRIC, nut as hexNut, type MetricSize } from '../common';
import { ISO_METRIC } from './bdw';
import { NDFEB } from '../families';
import { densityKg } from '../mass';
import { familyNode, type PartFamily } from './maker';
import type { BlockDef } from '../blocks';

// ---- the tables copied from bd_warehouse ---------------------------------------------------------------------------
/** Hex nuts with a flange, DIN 1665: flange thickness c, flange diameter dc, height m, across flats s (mm). */
export const DIN1665: Record<string, { c: number; dc: number; m: number; s: number }> = {
  M5: { c: 1, dc: 11.8, m: 5, s: 8 }, M6: { c: 1.1, dc: 14.2, m: 6, s: 10 }, M8: { c: 1.2, dc: 17.9, m: 8, s: 13 }, M10: { c: 1.5, dc: 21.8, m: 10, s: 15 }, M12: { c: 1.8, dc: 26, m: 12, s: 18 }, M14: { c: 2.1, dc: 29.9, m: 14, s: 21 }, M16: { c: 2.4, dc: 34.5, m: 16, s: 24 }, M20: { c: 3, dc: 42.8, m: 20, s: 30 },
};
/** Square nuts, DIN 557: height m, across flats s (mm). */
export const DIN557: Record<string, { m: number; s: number }> = {
  M5: { m: 4, s: 8 }, M6: { m: 5, s: 10 }, M8: { m: 6.5, s: 13 }, M10: { m: 8, s: 17 }, M12: { m: 10, s: 19 }, M16: { m: 13, s: 24 },
};
/** Pan heads, ISO 14583 (the head ISO 7045 shares): head diameter dk, height k, its recess, lengths L (mm). */
export const ISO14583: Record<string, { dk: number; k: number; recess: string; L: [number, number] }> = {
  M2: { dk: 4, k: 1.6, recess: 'T6', L: [3, 20] }, 'M2.5': { dk: 5, k: 2.1, recess: 'T8', L: [3, 25] }, M3: { dk: 5.6, k: 2.4, recess: 'T10', L: [4, 30] }, 'M3.5': { dk: 7, k: 2.6, recess: 'T15', L: [5, 35] }, M4: { dk: 8, k: 3.1, recess: 'T20', L: [5, 40] }, M5: { dk: 9.5, k: 3.7, recess: 'T25', L: [6, 50] }, M6: { dk: 12, k: 4.6, recess: 'T30', L: [8, 60] }, M8: { dk: 16, k: 6, recess: 'T45', L: [10, 60] }, M10: { dk: 20, k: 7.5, recess: 'T50', L: [12, 60] },
};
/** Domed cap (acorn) nuts, DIN 1587: the dome's diameter dk, the hex's height m, across flats s (mm). */
export const DIN1587: Record<string, { dk: number; m: number; s: number }> = {
  M4: { dk: 6.5, m: 3.2, s: 7 }, M5: { dk: 7.5, m: 4, s: 8 }, M6: { dk: 9.5, m: 5, s: 10 }, M8: { dk: 12.5, m: 6.5, s: 13 }, M10: { dk: 15, m: 8.8, s: 16 }, M12: { dk: 17, m: 10, s: 18 }, M14: { dk: 20, m: 11, s: 21 }, M16: { dk: 23, m: 13, s: 24 }, M18: { dk: 26, m: 15, s: 27 }, M20: { dk: 28, m: 16, s: 30 }, M22: { dk: 33, m: 18, s: 34 }, M24: { dk: 34, m: 19, s: 36 },
};
/** Shoulder screws, ISO 7379 (shoulder_screw.csv): shoulder ds, head dk and k, thread length b, key s, socket t, the
 *  shoulder lengths sold L (mm). */
export const ISO7379: Record<string, { ds: number; dk: number; k: number; b: number; s: number; t: number; L: [number, number] }> = {
  M5: { ds: 6.5, dk: 10, k: 4.5, b: 9.5, s: 3, t: 2.4, L: [10, 120] }, M6: { ds: 8, dk: 13, k: 5.5, b: 11, s: 4, t: 3.3, L: [12, 120] }, M8: { ds: 10, dk: 16, k: 7, b: 13, s: 5, t: 4.2, L: [16, 120] }, M10: { ds: 13, dk: 18, k: 9, b: 16, s: 6, t: 4.9, L: [20, 120] },
  M12: { ds: 16, dk: 24, k: 11, b: 18, s: 8, t: 6.6, L: [25, 120] }, M16: { ds: 20, dk: 30, k: 14, b: 22, s: 10, t: 8.8, L: [30, 120] }, M20: { ds: 25, dk: 36, k: 16, b: 27, s: 12, t: 10, L: [40, 120] },
};
/** Heat-set threaded inserts by each maker's own row (heatset_nut_parameters.csv): outside (knurl crest) s, length m, the
 *  knurl's root dc, its knurls, the least wall of plastic round it, the maker and its part number or page (mm). */
export const HEATSET: Record<string, { s: number; m: number; dc: number; knurls: number; wall: number; maker: string; part: string }> = {
  'M2-0.4-Short McMaster-Carr': { s: 3.6, m: 2.5, dc: 3.1, knurls: 20, wall: 3.3, maker: 'McMaster-Carr', part: '94459A110' },
  'M2-0.4-Standard McMaster-Carr': { s: 3.6, m: 4, dc: 3.1, knurls: 20, wall: 4.7, maker: 'McMaster-Carr', part: '94459A120' },
  'M3-0.5-Short McMaster-Carr': { s: 4.7, m: 4.3, dc: 3.9, knurls: 20, wall: 5.1, maker: 'McMaster-Carr', part: '94459A130' },
  'M3-0.5-Standard McMaster-Carr': { s: 4.7, m: 5.7, dc: 3.9, knurls: 20, wall: 6.5, maker: 'McMaster-Carr', part: '94459A140' },
  'M4-0.7-Short McMaster-Carr': { s: 6.3, m: 4.7, dc: 5.5, knurls: 20, wall: 5.5, maker: 'McMaster-Carr', part: '94459A150' },
  'M4-0.7-Standard McMaster-Carr': { s: 6.3, m: 8.2, dc: 5.5, knurls: 20, wall: 8.9, maker: 'McMaster-Carr', part: '94459A170' },
  'M5-0.8-Standard McMaster-Carr': { s: 7.1, m: 9.5, dc: 6.3, knurls: 20, wall: 10.3, maker: 'McMaster-Carr', part: '94459A180' },
  'M2-0.4-3 Hilitchi': { s: 3.5, m: 3, dc: 2.9, knurls: 20, wall: 3.8, maker: 'Hilitchi', part: 'H-THM300' },
  'M2-0.4-4 Hilitchi': { s: 3.5, m: 4, dc: 2.9, knurls: 20, wall: 4.8, maker: 'Hilitchi', part: 'H-THM300' },
  'M2-0.4-6 Hilitchi': { s: 3.5, m: 6, dc: 2.9, knurls: 20, wall: 6.8, maker: 'Hilitchi', part: 'H-THM300' },
  'M2-0.4-8 Hilitchi': { s: 3.5, m: 8, dc: 2.9, knurls: 20, wall: 8.8, maker: 'Hilitchi', part: 'H-THM300' },
  'M3-0.5-6 Hilitchi': { s: 5, m: 6, dc: 4.3, knurls: 20, wall: 6.8, maker: 'Hilitchi', part: 'H-THM300' },
  'M3-0.5-8 Hilitchi': { s: 5, m: 8, dc: 4.3, knurls: 20, wall: 8.8, maker: 'Hilitchi', part: 'H-THM300' },
  'M3-0.5-10 Hilitchi': { s: 5, m: 10, dc: 4.3, knurls: 20, wall: 10.8, maker: 'Hilitchi', part: 'H-THM300' },
  'M4-0.7-8 Hilitchi': { s: 6, m: 8, dc: 5.3, knurls: 20, wall: 8.8, maker: 'Hilitchi', part: 'H-THM300' },
  'M4-0.7-6 Hilitchi': { s: 6, m: 6, dc: 5.3, knurls: 20, wall: 6.8, maker: 'Hilitchi', part: 'H-THM300' },
  'M4-0.7-10 Hilitchi': { s: 6, m: 10, dc: 5.3, knurls: 20, wall: 10.8, maker: 'Hilitchi', part: 'H-THM300' },
  'M5-0.8-6 Hilitchi': { s: 7, m: 6, dc: 6.3, knurls: 20, wall: 6.8, maker: 'Hilitchi', part: 'H-THM300' },
  'M5-0.8-8 Hilitchi': { s: 7, m: 8, dc: 6.3, knurls: 20, wall: 8.8, maker: 'Hilitchi', part: 'H-THM300' },
  'M5-0.8-10 Hilitchi': { s: 7, m: 10, dc: 6.3, knurls: 20, wall: 10.8, maker: 'Hilitchi', part: 'H-THM300' },
  'M6-1-10 Hilitchi': { s: 8, m: 10, dc: 7.3, knurls: 20, wall: 10.8, maker: 'Hilitchi', part: 'H-THM300' },
  'M6-1-12 Hilitchi': { s: 8, m: 12, dc: 7.3, knurls: 20, wall: 12.8, maker: 'Hilitchi', part: 'H-THM300' },
  'M1.4-0.3-H1.5-D2.3 AE-SamZhihui': { s: 2.3, m: 1.5, dc: 1.9, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M1.4-0.3-H2-D2.3 AE-SamZhihui': { s: 2.3, m: 2, dc: 1.9, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M1.4-0.3-H3-D2.3 AE-SamZhihui': { s: 2.3, m: 3, dc: 1.9, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M1.4-0.3-H4-D2.3 AE-SamZhihui': { s: 2.3, m: 4, dc: 1.9, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M1.4-0.3-H5-D2.3 AE-SamZhihui': { s: 2.3, m: 5, dc: 1.9, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M1.4-0.3-H6-D2.3 AE-SamZhihui': { s: 2.3, m: 6, dc: 1.9, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M1.6-0.35-H2-D2.5 AE-SamZhihui': { s: 2.5, m: 2, dc: 2, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M1.6-0.35-H3-D2.5 AE-SamZhihui': { s: 2.5, m: 3, dc: 2, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M1.6-0.35-H4-D2.5 AE-SamZhihui': { s: 2.5, m: 4, dc: 2, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M1.6-0.35-H5-D2.5 AE-SamZhihui': { s: 2.5, m: 5, dc: 2, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M1.6-0.35-H6-D2.5 AE-SamZhihui': { s: 2.5, m: 6, dc: 2, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M2-0.4-H2-D3 AE-SamZhihui': { s: 3, m: 2, dc: 2.68, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M2-0.4-H3-D3 AE-SamZhihui': { s: 3, m: 3, dc: 2.68, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M2-0.4-H4-D3 AE-SamZhihui': { s: 3, m: 4, dc: 2.68, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M2-0.4-H5-D3 AE-SamZhihui': { s: 3, m: 5, dc: 2.68, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M2-0.4-H6-D3 AE-SamZhihui': { s: 3, m: 6, dc: 2.68, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M2-0.4-H8-D3 AE-SamZhihui': { s: 3, m: 8, dc: 2.68, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M2-0.4-H2-D3.2 AE-SamZhihui': { s: 3.2, m: 2, dc: 2.81, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M2-0.4-H3-D3.2 AE-SamZhihui': { s: 3.2, m: 3, dc: 2.81, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M2-0.4-H4-D3.2 AE-SamZhihui': { s: 3.2, m: 4, dc: 2.81, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M2-0.4-H5-D3.2 AE-SamZhihui': { s: 3.2, m: 5, dc: 2.81, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M2-0.4-H6-D3.2 AE-SamZhihui': { s: 3.2, m: 6, dc: 2.81, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M2-0.4-H8-D3.2 AE-SamZhihui': { s: 3.2, m: 8, dc: 2.81, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M2-0.4-H2-D3.5 AE-SamZhihui': { s: 3.5, m: 2, dc: 3.03, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M2-0.4-H3-D3.5 AE-SamZhihui': { s: 3.5, m: 3, dc: 3.03, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M2-0.4-H4-D3.5 AE-SamZhihui': { s: 3.5, m: 4, dc: 3.03, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M2-0.4-H5-D3.5 AE-SamZhihui': { s: 3.5, m: 5, dc: 3.03, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M2-0.4-H6-D3.5 AE-SamZhihui': { s: 3.5, m: 6, dc: 3.03, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M2.5-0.45-H2-D3.5 AE-SamZhihui': { s: 3.5, m: 2, dc: 3.04, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M2.5-0.45-H3-D3.5 AE-SamZhihui': { s: 3.5, m: 3, dc: 3.04, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M2.5-0.45-H4-D3.5 AE-SamZhihui': { s: 3.5, m: 4, dc: 3.04, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M2.5-0.45-H5-D3.5 AE-SamZhihui': { s: 3.5, m: 5, dc: 3.04, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M2.5-0.45-H6-D3.5 AE-SamZhihui': { s: 3.5, m: 6, dc: 3.04, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M2.5-0.45-H7-D3.5 AE-SamZhihui': { s: 3.5, m: 7, dc: 3.04, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M2.5-0.45-H8-D3.5 AE-SamZhihui': { s: 3.5, m: 8, dc: 3.04, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M2.5-0.45-H2-D4 AE-SamZhihui': { s: 4, m: 2, dc: 3.44, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M2.5-0.45-H3-D4 AE-SamZhihui': { s: 4, m: 3, dc: 3.44, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M2.5-0.45-H4-D4 AE-SamZhihui': { s: 4, m: 4, dc: 3.44, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M2.5-0.45-H5-D4 AE-SamZhihui': { s: 4, m: 5, dc: 3.44, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M2.5-0.45-H6-D4 AE-SamZhihui': { s: 4, m: 6, dc: 3.44, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M2.5-0.45-H7-D4 AE-SamZhihui': { s: 4, m: 7, dc: 3.44, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M2.5-0.45-H8-D4 AE-SamZhihui': { s: 4, m: 8, dc: 3.44, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M3-0.5-H3-D4.2 AE-SamZhihui': { s: 4.2, m: 3, dc: 3.74, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M3-0.5-H4-D4.2 AE-SamZhihui': { s: 4.2, m: 4, dc: 3.74, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M3-0.5-H5-D4.2 AE-SamZhihui': { s: 4.2, m: 5, dc: 3.74, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M3-0.5-H6-D4.2 AE-SamZhihui': { s: 4.2, m: 6, dc: 3.74, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M3-0.5-H7-D4.2 AE-SamZhihui': { s: 4.2, m: 7, dc: 3.74, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M3-0.5-H8-D4.2 AE-SamZhihui': { s: 4.2, m: 8, dc: 3.74, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M3-0.5-H9-D4.2 AE-SamZhihui': { s: 4.2, m: 9, dc: 3.74, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M3-0.5-H10-D4.2 AE-SamZhihui': { s: 4.2, m: 10, dc: 3.74, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M3-0.5-H3-D4.5 AE-SamZhihui': { s: 4.5, m: 3, dc: 3.9, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M3-0.5-H4-D4.5 AE-SamZhihui': { s: 4.5, m: 4, dc: 3.9, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M3-0.5-H5-D4.5 AE-SamZhihui': { s: 4.5, m: 5, dc: 3.9, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M3-0.5-H6-D4.5 AE-SamZhihui': { s: 4.5, m: 6, dc: 3.9, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M3-0.5-H7-D4.5 AE-SamZhihui': { s: 4.5, m: 7, dc: 3.9, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M3-0.5-H8-D4.5 AE-SamZhihui': { s: 4.5, m: 8, dc: 3.9, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M3-0.5-H9-D4.5 AE-SamZhihui': { s: 4.5, m: 9, dc: 3.9, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M3-0.5-H10-D4.5 AE-SamZhihui': { s: 4.5, m: 10, dc: 3.9, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M3-0.5-H3-D5 AE-SamZhihui': { s: 5, m: 3, dc: 4.17, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M3-0.5-H4-D5 AE-SamZhihui': { s: 5, m: 4, dc: 4.17, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M3-0.5-H5-D5 AE-SamZhihui': { s: 5, m: 5, dc: 4.17, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M3-0.5-H6-D5 AE-SamZhihui': { s: 5, m: 6, dc: 4.17, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M3-0.5-H7-D5 AE-SamZhihui': { s: 5, m: 7, dc: 4.17, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M3-0.5-H8-D5 AE-SamZhihui': { s: 5, m: 8, dc: 4.17, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M3-0.5-H9-D5 AE-SamZhihui': { s: 5, m: 9, dc: 4.17, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M3-0.5-H10-D5 AE-SamZhihui': { s: 5, m: 10, dc: 4.17, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M4-0.7-H4-D6 AE-SamZhihui': { s: 6, m: 4, dc: 5.33, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M4-0.7-H5-D6 AE-SamZhihui': { s: 6, m: 5, dc: 5.33, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M4-0.7-H6-D6 AE-SamZhihui': { s: 6, m: 6, dc: 5.33, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M4-0.7-H7-D6 AE-SamZhihui': { s: 6, m: 7, dc: 5.33, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M4-0.7-H8-D6 AE-SamZhihui': { s: 6, m: 8, dc: 5.33, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M4-0.7-H9-D6 AE-SamZhihui': { s: 6, m: 9, dc: 5.33, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M4-0.7-H10-D6 AE-SamZhihui': { s: 6, m: 10, dc: 5.33, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M4-0.7-H12-D6 AE-SamZhihui': { s: 6, m: 12, dc: 5.33, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M5-0.8-H4-D7 AE-SamZhihui': { s: 7, m: 4, dc: 6.12, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M5-0.8-H5-D7 AE-SamZhihui': { s: 7, m: 5, dc: 6.12, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M5-0.8-H6-D7 AE-SamZhihui': { s: 7, m: 6, dc: 6.12, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M5-0.8-H7-D7 AE-SamZhihui': { s: 7, m: 7, dc: 6.12, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M5-0.8-H8-D7 AE-SamZhihui': { s: 7, m: 8, dc: 6.12, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M5-0.8-H9-D7 AE-SamZhihui': { s: 7, m: 9, dc: 6.12, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M5-0.8-H10-D7 AE-SamZhihui': { s: 7, m: 10, dc: 6.12, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M5-0.8-H11-D7 AE-SamZhihui': { s: 7, m: 11, dc: 6.12, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M5-0.8-H12-D7 AE-SamZhihui': { s: 7, m: 12, dc: 6.12, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M5-0.8-H5-D8 AE-SamZhihui': { s: 8, m: 5, dc: 6.97, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M5-0.8-H6-D8 AE-SamZhihui': { s: 8, m: 6, dc: 6.97, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M5-0.8-H7-D8 AE-SamZhihui': { s: 8, m: 7, dc: 6.97, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M5-0.8-H8-D8 AE-SamZhihui': { s: 8, m: 8, dc: 6.97, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M5-0.8-H9-D8 AE-SamZhihui': { s: 8, m: 9, dc: 6.97, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M5-0.8-H10-D8 AE-SamZhihui': { s: 8, m: 10, dc: 6.97, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M6-1-H4-D8 AE-SamZhihui': { s: 8, m: 4, dc: 7.09, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M6-1-H5-D8 AE-SamZhihui': { s: 8, m: 5, dc: 7.09, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M6-1-H6-D8 AE-SamZhihui': { s: 8, m: 6, dc: 7.09, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M6-1-H7-D8 AE-SamZhihui': { s: 8, m: 7, dc: 7.09, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M6-1-H8-D8 AE-SamZhihui': { s: 8, m: 8, dc: 7.09, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M6-1-H9-D8 AE-SamZhihui': { s: 8, m: 9, dc: 7.09, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M6-1-H10-D8 AE-SamZhihui': { s: 8, m: 10, dc: 7.09, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
  'M6-1-H11-D8 AE-SamZhihui': { s: 8, m: 11, dc: 7.09, knurls: 20, wall: 0, maker: 'AE-SamZhihui', part: 'https://www.aliexpress.com/item/1005005220632314.html' },
};

// ---- the tables recalled or typical (each one's source and status below, in HARDWARE_SOURCES and HARDWARE_STATUS) ---
/** Nyloc nuts, ISO 7040: their height h (its maximum, mm), the hex (s) and its steel part's height (ISO 4032's m) read
 *  from the one metric table. Written from recall of makers' tables of the standard, read from no source here: typical. */
export const ISO7040: Record<string, { h: number }> = { M3: { h: 4.5 }, M4: { h: 6 }, M5: { h: 6.8 }, M6: { h: 8 }, M8: { h: 9.5 }, M10: { h: 11.5 }, M12: { h: 14 }, M14: { h: 16 }, M16: { h: 18 }, M20: { h: 22 }, M24: { h: 27 } };
/** Wood screws, countersunk 90°: head dk about twice the thread (typical, DIN 7997's proportions), mm. */
export const WOOD: Record<string, { d: number; dk: number }> = { '3': { d: 3, dk: 6 }, '3.5': { d: 3.5, dk: 7 }, '4': { d: 4, dk: 8 }, '4.5': { d: 4.5, dk: 9 }, '5': { d: 5, dk: 10 }, '6': { d: 6, dk: 12 } };
/** Sliding T-slot nuts for aluminium profile by series and thread: body (under the slot's lips) w × h, length L, neck (in
 *  the slot's opening) w × h, mm (typical of makers' sliding nuts; the slot 6 of the 20 series, 8 of the 30 and 40, 10 of
 *  the 45). */
export const TNUTS: Record<string, { slot: number; bw: number; bh: number; L: number; nw: number; nh: number }> = {
  '20 M3': { slot: 6, bw: 10, bh: 2.5, L: 10, nw: 5.8, nh: 1.6 }, '20 M4': { slot: 6, bw: 10, bh: 2.5, L: 10, nw: 5.8, nh: 1.6 }, '20 M5': { slot: 6, bw: 10, bh: 2.5, L: 10, nw: 5.8, nh: 1.6 },
  '30 M4': { slot: 8, bw: 16, bh: 3.5, L: 13, nw: 7.8, nh: 2.3 }, '30 M5': { slot: 8, bw: 16, bh: 3.5, L: 13, nw: 7.8, nh: 2.3 }, '30 M6': { slot: 8, bw: 16, bh: 3.5, L: 13, nw: 7.8, nh: 2.3 },
  '40 M4': { slot: 8, bw: 18, bh: 4.5, L: 15, nw: 7.8, nh: 3.8 }, '40 M5': { slot: 8, bw: 18, bh: 4.5, L: 15, nw: 7.8, nh: 3.8 }, '40 M6': { slot: 8, bw: 18, bh: 4.5, L: 15, nw: 7.8, nh: 3.8 },
  '45 M6': { slot: 10, bw: 20, bh: 5.5, L: 18, nw: 9.8, nh: 4.5 }, '45 M8': { slot: 10, bw: 20, bh: 5.5, L: 18, nw: 9.8, nh: 4.5 },
};
/** Blind rivets by diameter: head dk and k, mandrel dm (mm, typical of ISO 15983's open-end rivets), and the lengths
 *  sold (src/nexus/kinds/fasteners.ts). */
export const RIVETS: Record<string, { dk: number; k: number; dm: number; L: number[] }> = {
  '2.4': { dk: 5, k: 0.8, dm: 1.45, L: [4, 6, 8, 10] }, '3.2': { dk: 6.5, k: 1, dm: 1.85, L: [6, 8, 10, 12, 16] }, '4': { dk: 8, k: 1.3, dm: 2.2, L: [6, 8, 10, 12, 14, 16, 20] },
  '4.8': { dk: 9.5, k: 1.5, dm: 2.7, L: [8, 10, 12, 14, 16, 20, 25] }, '6.4': { dk: 13, k: 2, dm: 3.6, L: [10, 12, 16, 20, 25, 30] },
};
/** Split pins, ISO 1234, by the hole they go in: the pin's diameter dw and its eye's c (their maxima, mm; recalled from
 *  makers' tables of the standard, read from no source here: typical). */
export const ISO1234: Record<string, { dw: number; c: number }> = {
  '1': { dw: 0.9, c: 1.8 }, '1.2': { dw: 1, c: 2 }, '1.6': { dw: 1.4, c: 2.8 }, '2': { dw: 1.8, c: 3.6 }, '2.5': { dw: 2.3, c: 4.6 }, '3.2': { dw: 2.9, c: 5.8 }, '4': { dw: 3.7, c: 7.4 }, '5': { dw: 4.6, c: 9.2 }, '6.3': { dw: 5.9, c: 11.8 }, '8': { dw: 7.5, c: 15 },
};
/** Clevis pins, ISO 2341 B: head dk and k, cross hole d1, the hole's distance from the end le (mm; recalled from makers'
 *  tables of the standard, read from no source here: typical). */
export const ISO2341: Record<string, { dk: number; k: number; d1: number; le: number }> = {
  '3': { dk: 5, k: 1, d1: 0.8, le: 1.6 }, '4': { dk: 6, k: 1, d1: 1, le: 2.2 }, '5': { dk: 8, k: 1.6, d1: 1.2, le: 2.9 }, '6': { dk: 10, k: 2, d1: 1.6, le: 3.2 }, '8': { dk: 14, k: 3, d1: 2, le: 3.5 },
  '10': { dk: 18, k: 4, d1: 3.2, le: 4.5 }, '12': { dk: 20, k: 4, d1: 3.2, le: 5.5 }, '14': { dk: 22, k: 4, d1: 4, le: 6 }, '16': { dk: 25, k: 4.5, d1: 4, le: 6 }, '20': { dk: 30, k: 5, d1: 5, le: 8 },
};
/** Split lock (spring) washers, DIN 127 B: d1 × d2, thickness s (mm), as src/nexus/kinds/fasteners.ts gives them. */
export const DIN127: Record<string, { d1: number; d2: number; s: number }> = {
  M3: { d1: 3.1, d2: 6.2, s: 0.8 }, M4: { d1: 4.1, d2: 7.6, s: 0.9 }, M5: { d1: 5.1, d2: 9.2, s: 1.2 }, M6: { d1: 6.1, d2: 11.8, s: 1.6 }, M8: { d1: 8.2, d2: 14.8, s: 2 }, M10: { d1: 10.2, d2: 18.1, s: 2.2 },
  M12: { d1: 12.2, d2: 21.1, s: 2.5 }, M14: { d1: 14.2, d2: 24.1, s: 3 }, M16: { d1: 16.2, d2: 27.4, s: 3.5 }, M20: { d1: 20.2, d2: 33.6, s: 4 }, M24: { d1: 24.5, d2: 40, s: 5 },
};
/** Hex standoffs, male-female or female-female: across flats af, the male stud's length (mm, typical of makers' brass
 *  standoffs). */
export const STANDOFFS: Record<string, { af: number; stud: number }> = { 'M2.5': { af: 5, stud: 6 }, M3: { af: 5.5, stud: 6 }, M4: { af: 7, stud: 8 } };
/** NdFeB magnets, the stock sizes sold: discs d × h, blocks L × W × h, mm (typical); magnetised through h. */
export const MAG_DISCS: Record<string, { d: number; h: number }> = Object.fromEntries([[3, 1], [5, 1], [5, 2], [6, 2], [6, 3], [8, 2], [8, 3], [10, 1], [10, 2], [10, 3], [10, 5], [12, 3], [15, 3], [15, 5], [20, 3], [20, 5], [20, 10], [25, 5], [30, 10]].map(([d, h]) => [`${d}x${h}`, { d: d!, h: h! }]));
export const MAG_BLOCKS: Record<string, { L: number; W: number; h: number }> = Object.fromEntries([[10, 5, 2], [10, 10, 3], [20, 10, 3], [20, 10, 5], [30, 10, 5], [40, 20, 10], [50, 25, 10]].map(([L, W, h]) => [`${L}x${W}x${h}`, { L: L!, W: W!, h: h! }]));
/** Pull handles on the 32 mm system: their screws' centres c (mm); the bar c + 24 long, 12 × 12 in section, on two legs
 *  12 wide standing it 23 off the face, each leg tapped M4 10 deep (typical). */
export const HANDLES: Record<string, { c: number }> = Object.fromEntries([64, 96, 128, 160, 192, 224, 256, 320, 448].map((c) => [String(c), { c }]));
/** Star knobs, DIN 6336: the grip's diameter D by thread (src/nexus/kinds/stock.ts); its thickness 0.6 D, its stud's
 *  length and its insert (outside 1.6 d + 1, 0.7 of the grip deep) typical. */
export const DIN6336: Record<string, { D: number; stud: number }> = { M4: { D: 25, stud: 20 }, M5: { D: 32, stud: 20 }, M6: { D: 32, stud: 20 }, M8: { D: 40, stud: 25 }, M10: { D: 50, stud: 30 }, M12: { D: 63, stud: 35 }, M16: { D: 80, stud: 40 } };
/** Self-adhesive bumpers, domed: diameter × height (mm, typical of the sizes sold). */
export const BUMPERS: Record<string, { D: number; h: number }> = Object.fromEntries([[8, 2.2], [10, 3], [12.7, 3.5], [11, 5], [16, 8], [19, 6], [22, 10]].map(([D, h]) => [`${D}x${h}`, { D: D!, h: h! }]));
/** Screw-on rubber feet, a frustum D across at the floor (0.8 D at the top) and H high, counterbored from below for its
 *  screw (mm, typical). */
export const FEET: Record<string, { D: number; H: number; screw: string }> = { '15x8': { D: 15, H: 8, screw: 'M3' }, '20x10': { D: 20, H: 10, screw: 'M4' }, '25x12': { D: 25, H: 12, screw: 'M4' }, '30x15': { D: 30, H: 15, screw: 'M5' }, '40x20': { D: 40, H: 20, screw: 'M6' }, '50x25': { D: 50, H: 25, screw: 'M8' } };
/** Full-extension ball-bearing drawer slides by length (mm, 250 to 700 in 50 mm steps, as sold; 45 high, 12.7 thick, of
 *  1.2 mm sheet, holes Ø4.5 37 mm from each end and at the middle: typical). */
export const SLIDES: Record<string, { L: number }> = Object.fromEntries(Array.from({ length: 10 }, (_, i) => 250 + 50 * i).map((L) => [String(L), { L }]));
/** Gas springs by rod / body diameter: the longest stroke sold, the forces sold (N), the body's wall and its end eyes'
 *  hole (mm, typical; the sizes and strokes as src/nexus/kinds/motion.ts gives them). */
export const GASSTRUTS: Record<string, { r: number; b: number; sMax: number; F: [number, number]; wall: number; eye: number }> = {
  '6/15': { r: 6, b: 15, sMax: 150, F: [20, 400], wall: 1, eye: 6.1 }, '8/18': { r: 8, b: 18, sMax: 250, F: [50, 800], wall: 1.2, eye: 8.1 },
  '10/22': { r: 10, b: 22, sMax: 400, F: [100, 1200], wall: 1.2, eye: 8.1 }, '14/28': { r: 14, b: 28, sMax: 500, F: [400, 2500], wall: 1.5, eye: 10.1 },
};
/** Piano hinges by open width: leaf thickness t, knuckle outside od and pin (mm, typical); screw holes Ø3.5 every 50 mm. */
export const PIANO: Record<string, { t: number; od: number; pin: number }> = { '25': { t: 0.8, od: 3, pin: 1.6 }, '32': { t: 1, od: 3.5, pin: 1.8 }, '40': { t: 1, od: 4, pin: 2 }, '50': { t: 1.2, od: 5, pin: 2.5 } };
/** Cable ties by length × width (src/nexus/kinds/fasteners.ts), their strap's thickness (mm, typical). */
export const TIES: Record<string, { L: number; w: number; t: number }> = Object.fromEntries((['100x2.5', '140x3.6', '200x3.6', '200x4.8', '250x4.8', '300x4.8', '370x4.8', '300x7.6', '450x7.6', '550x9'] as const).map((k) => { const [L, w] = k.split('x').map(Number) as [number, number]; return [k, { L, w, t: ({ 2.5: 1, 3.6: 1.1, 4.8: 1.3, 7.6: 1.6, 9: 1.8 } as Record<number, number>)[w]! }]; }));

/** Where each table's figures come from. */
export const HARDWARE_SOURCES: Record<string, string> = {
  DIN1665: 'DIN 1665 as bd_warehouse gives it (hex_nut_with_flange_parameters.csv, Apache-2.0)', DIN557: 'DIN 557 as bd_warehouse gives it (square_nut_parameters.csv, Apache-2.0)',
  ISO14583: 'ISO 14583 as bd_warehouse gives it (pan_head_parameters.csv, Apache-2.0)', HEATSET: 'each maker\'s row as bd_warehouse gives it (heatset_nut_parameters.csv, Apache-2.0): McMaster-Carr, Hilitchi, AE-SamZhihui',
  ISO7040: 'ISO 7040 h max, recalled from makers\' tables, read from no source here (typical)', WOOD: 'typical (DIN 7997\'s proportions, dk about 2d)', TNUTS: 'typical of makers\' sliding T-slot nuts',
  RIVETS: 'typical of ISO 15983 open-end blind rivets; lengths from src/nexus/kinds/fasteners.ts', ISO1234: 'ISO 1234 (d and c maxima), recalled from makers\' tables, read from no source here (typical)',
  ISO2341: 'ISO 2341 B, recalled from makers\' tables, read from no source here (typical)', DIN127: 'DIN 127 B as src/nexus/kinds/fasteners.ts gives it', STANDOFFS: 'typical of makers\' hex standoffs',
  MAG_DISCS: 'typical stock sizes', MAG_BLOCKS: 'typical stock sizes', HANDLES: 'the 32 mm system\'s centres; the handle\'s section typical', DIN6336: 'DIN 6336 diameters as src/nexus/kinds/stock.ts gives them; the rest typical',
  BUMPERS: 'typical sizes sold', FEET: 'typical', SLIDES: 'lengths as sold (src/nexus/kinds/stock.ts); sections typical', GASSTRUTS: 'sizes and strokes as src/nexus/kinds/motion.ts gives them; walls and eyes typical',
  PIANO: 'typical', TIES: 'sizes as src/nexus/kinds/fasteners.ts gives them; thickness typical',
  DIN1587: 'DIN 1587 as bd_warehouse gives it (domed_cap_nut_parameters.csv, Apache-2.0)', ISO7379: 'ISO 7379 as bd_warehouse gives it (shoulder_screw.csv, Apache-2.0)',
  ISO7093: 'ISO 7093 as src/nexus/kinds/fasteners.ts gives it', ISO8752: 'ISO 8752 heavy-duty diameters; walls about d/5, typical', CARRIAGE: 'typical (DIN 603\'s proportions)',
  RIVNUTS: 'typical of flat-head rivet nuts (holes as src/nexus/kinds/fasteners.ts gives them)', PLUGS: 'sizes as src/nexus/kinds/fasteners.ts gives them; bore typical',
};
/** What each table's figures are (src/nexus/evidence.ts). */
export const HARDWARE_STATUS: Record<string, string> = Object.fromEntries(Object.keys(HARDWARE_SOURCES).map((k) => [k, ['DIN1665', 'DIN557', 'ISO14583', 'HEATSET', 'DIN127', 'DIN1587', 'ISO7379', 'ISO7093'].includes(k) ? 'specified' : 'typical']));
/** Large (fender) washers, ISO 7093: d1 × d2 × h (mm), as src/nexus/kinds/fasteners.ts gives them. */
export const ISO7093: Record<string, { d1: number; d2: number; h: number }> = {
  M3: { d1: 3.2, d2: 9, h: 0.8 }, M4: { d1: 4.3, d2: 12, h: 1 }, M5: { d1: 5.3, d2: 15, h: 1.2 }, M6: { d1: 6.4, d2: 18, h: 1.6 }, M8: { d1: 8.4, d2: 24, h: 2 }, M10: { d1: 10.5, d2: 30, h: 2.5 }, M12: { d1: 13, d2: 37, h: 3 }, M14: { d1: 15, d2: 44, h: 3 }, M16: { d1: 17, d2: 50, h: 3 }, M20: { d1: 22, d2: 60, h: 4 },
};
/** Spring (roll) pins, ISO 8752 heavy duty, by diameter: their wall s (mm, about d/5, typical). */
export const ISO8752: Record<string, { d: number; s: number }> = Object.fromEntries([1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12].map((d) => [String(d), { d, s: +(d / 5).toFixed(2) }]));
/** Carriage bolts, DIN 603's proportions: dome 2.5 d across, 0.55 d high, square neck d across and 0.6 d long (typical). */
export const CARRIAGE: Record<string, { d: number }> = Object.fromEntries(['M5', 'M6', 'M8', 'M10', 'M12'].map((k) => [k, { d: Number(k.slice(1)) }]));
/** Flat-head rivet nuts: body outside (= the hole), length, head diameter and thickness (mm, typical). */
export const RIVNUTS: Record<string, { od: number; L: number; dh: number; k: number }> = { M3: { od: 5, L: 9, dh: 7, k: 0.8 }, M4: { od: 6, L: 10.5, dh: 9, k: 1 }, M5: { od: 7, L: 12, dh: 10, k: 1 }, M6: { od: 9, L: 15, dh: 13, k: 1.5 }, M8: { od: 11, L: 18, dh: 16, k: 1.5 }, M10: { od: 13, L: 22, dh: 19, k: 2 } };
/** Nylon wall plugs by diameter (= the drill) × length; their bore 0.55 d (mm; sizes as src/nexus/kinds/fasteners.ts gives them). */
export const PLUGS: Record<string, { d: number; L: number }> = Object.fromEntries(([[5, 25], [6, 30], [6, 50], [8, 40], [8, 65], [10, 50], [10, 80], [12, 60], [12, 100], [14, 70]] as const).map(([d, L]) => [`${d} × ${L}`, { d, L }]));

// ---- helpers -----------------------------------------------------------------------------------------------------
const mm = (x: number): number => x / 1000;
const rho = (mat: string): number => { const d = densityKg(mat); if (d === undefined) throw new Error(`no density for ${mat}`); return d; };
const disc = (d: number) => (Math.PI * d * d) / 4;
const annulus = (D: number, d: number) => disc(D) - disc(d);
const hexA = (s: number) => (Math.sqrt(3) / 2) * s * s;
const corners = (s: number) => (2 * s) / Math.sqrt(3);
const frustum = (r1: number, r2: number, h: number) => (Math.PI * h * (r1 * r1 + r1 * r2 + r2 * r2)) / 3;
/** The volume of a (radius, height) outline turned about its axis (Pappus, segment by segment). */
const turnedVol = (pts: [number, number][]) => Math.abs(pts.reduce((v, p, i) => { const q = pts[(i + 1) % pts.length]!; return v + (Math.PI / 3) * (p[0] ** 2 + p[0] * q[0] + q[0] ** 2) * (q[1] - p[1]); }, 0));
/** A closed outline's area (the shoelace; a bore joined by a cut of no width taken out). */
const areaOf = (pts: [number, number][]) => Math.abs(pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]!; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
const len = (set: Record<string, unknown>, k = 'length') => Number(set[k]) / 1000;
const dOf = (size: string) => Number(size.replace(/^M/, '').split(/[-\s×x]/)[0]);
const above0 = (set: Record<string, unknown>, k: string, what: string) => (Number(set[k]) > 0 && Number.isFinite(Number(set[k])) ? null : `${what} above 0 (${String(set[k])} mm)`);
const n0 = (v: number) => +(v * 1000).toFixed(3);
/** A spherical cap's outline, its base a across and k high, as (radius, height) points from its base's middle. */
const capPts = (a: number, k: number, n = 12): [number, number][] => { const R = (a * a + k * k) / (2 * k), f0 = Math.asin(Math.min(1, a / R));
  return [[0, 0], ...Array.from({ length: n + 1 }, (_, i) => { const f = f0 * (1 - i / n); return [R * Math.sin(f), Math.max(0, k - R + R * Math.cos(f))] as [number, number]; })]; };
const MATS: Record<string, string> = { zinc: 'steel-low', steel: 'steel-low', black: 'steel-alloy', A2: 'stainless-304', stainless: 'stainless-304', aluminium: 'al-5052', brass: 'brass', nylon: 'nylon', zamak: 'zamak' };
const matOf = (set: Record<string, unknown>, k = 'matter', d = 'steel-low') => MATS[String(set[k])] ?? d;
const DARK = 0x2a2b2e, ZINC = 0xa9acb0;
const FAST = ['mechanical', 'manufacturing', 'everyday'];
const T = (pieces: number, more: Record<string, unknown> = {}, set?: Record<string, unknown>) => ({ ...(set ? { set } : {}), inputs: {}, outputs: { pieces, ...more } });

// ---- screws --------------------------------------------------------------------------------------------------------
type Csk = { d: number; a: number; dk: number; k: number; s: number; t: number; L: [number, number] };
const lenIn = (L: [number, number], set: Record<string, unknown>, std: string, size: string) => { const l = Number(set.length); return !(l > 0) ? `a length above 0 (${String(set.length)} mm)` : l < L[0] || l > L[1] ? `${std} gives ${size} in ${L[0]} to ${L[1]} mm (${l} mm asked)` : null; };
const CSK: PartFamily<Csk> = {
  id: 'piece.csk', name: 'Countersunk screw', gloss: 'A hex socket countersunk head screw (ISO 10642) by its size and length', domains: FAST,
  says: 'A countersunk socket screw (ISO 10642): its shank and its cone head (its socket drawn round, its thread not drawn), the head counted in its length. Its shank offers its axis; it passes down a countersunk hole (Through a line)',
  rows: Object.fromEntries(Object.entries(ISO_METRIC).filter(([, r]) => r.csk).map(([k, r]) => [k, { d: dOf(k), ...r.csk! }])), size: 'M5', source: 'ISO 10642 as bd_warehouse gives it (src/nexus/parts/bdw.ts)',
  settings: [{ key: 'length', label: 'Length (head included), mm', type: 'number', default: 20 }],
  cannot: (q, size, set) => lenIn(q.L, set, 'ISO 10642', size) ?? (len(set) > mm(q.k) ? null : `a length above its head's ${q.k} mm`),
  recipe: (q, size, set) => { const L = len(set), n = `${size} countersunk`;
    return stack(`${size}×${n0(L)} countersunk screw`, 1, [{ b: made(`${n} shank`, 'steel-alloy', { cyl: [mm(q.d) / 2, L - mm(q.k)] }, { color: DARK }) },
      { b: made(`${n} head`, 'steel-alloy', { cone: [mm(q.d) / 2, mm(q.dk) / 2, mm(q.k)] }, { color: DARK, pattern: { name: 'socket', points: [[0, 0]], hole: mm(q.s) / Math.sqrt(3), face: '+y', depth: mm(q.t) } }) }]); },
  expect: (q, _s, set) => { const L = len(set), sk = mm(q.s) / Math.sqrt(3); return { bound: [mm(q.dk), L, mm(q.dk)], mass: (disc(mm(q.d)) * (L - mm(q.k)) + frustum(mm(q.d) / 2, mm(q.dk) / 2, mm(q.k)) - Math.PI * sk * sk * mm(q.t)) * rho('steel-alloy'), tol: 0.01, massTol: 0.02, says: 'its head across by its length; nominal mass, shank, cone and its socket drawn round' }; },
  tests: [T(2, { offers: ['M5 countersunk head/axis', 'M5 countersunk head/socket', 'M5 countersunk shank/axis'] })],
};
type Btn = { d: number; dk: number; k: number; s: number; t: number; L: [number, number] };
const BUTTON: PartFamily<Btn> = {
  id: 'piece.buttonhead', name: 'Button head screw', gloss: 'A hex socket button head screw (ISO 7380-1) by its size and length', domains: FAST,
  says: 'A button head socket screw (ISO 7380-1): its shank and its low domed head (a spherical cap of its diameter and height, approximated; its socket drawn round). Its shank offers its axis',
  rows: Object.fromEntries(Object.entries(ISO_METRIC).filter(([, r]) => r.button).map(([k, r]) => [k, { d: dOf(k), ...r.button! }])), size: 'M5', source: 'ISO 7380-1 as bd_warehouse gives it (src/nexus/parts/bdw.ts)',
  settings: [{ key: 'length', label: 'Length under the head, mm', type: 'number', default: 12 }],
  cannot: (q, size, set) => lenIn(q.L, set, 'ISO 7380-1', size),
  recipe: (q, size, set) => { const L = len(set), n = `${size} button`;
    return stack(`${size}×${n0(L)} button head screw`, 1, [{ b: made(`${n} shank`, 'steel-alloy', { cyl: [mm(q.d) / 2, L] }, { color: DARK }) },
      { b: made(`${n} head`, 'steel-alloy', { lathe: { pts: capPts(mm(q.dk) / 2, mm(q.k)) } }, { color: DARK, pattern: { name: 'socket', points: [[0, 0]], hole: mm(q.s) / Math.sqrt(3), face: '+y', depth: mm(q.t) } }) }]); },
  expect: (q, _s, set) => { const L = len(set), sk = mm(q.s) / Math.sqrt(3); return { bound: [mm(q.dk), L + mm(q.k), mm(q.dk)], mass: (disc(mm(q.d)) * L + turnedVol(capPts(mm(q.dk) / 2, mm(q.k))) - Math.PI * sk * sk * mm(q.t)) * rho('steel-alloy'), tol: 0.01, massTol: 0.02, says: 'its head across by its length and head; nominal mass, shank, cap less its socket' }; },
  tests: [T(2)],
};
type Pan = { d: number; dk: number; k: number; recess: string; L: [number, number] };
const panPts = (a: number, k: number): [number, number][] => [[0, 0], [a, 0], [a, 0.55 * k], [0.85 * a, 0.85 * k], [0.55 * a, k], [0, k]];
const PAN: PartFamily<Pan> = {
  id: 'piece.panhead', name: 'Pan head screw', gloss: 'A pan head machine screw (ISO 14583, the head ISO 7045 shares) by its size and length', domains: FAST,
  says: 'A pan head machine screw (ISO 14583 hexalobular, or ISO 7045 cross recess: the same head): its shank and its rounded head (its outline approximated, its recess not drawn). Its shank offers its axis',
  rows: Object.fromEntries(Object.entries(ISO14583).map(([k, r]) => [k, { d: dOf(k), ...r }])), size: 'M4', source: 'ISO 14583 as bd_warehouse gives it (copied here, src/nexus/parts/hardware.ts)',
  settings: [{ key: 'length', label: 'Length under the head, mm', type: 'number', default: 12 }, { key: 'matter', label: 'Made of', type: 'choice', default: 'zinc', choices: ['zinc', 'A2'] }],
  cannot: (q, size, set) => lenIn(q.L, set, 'ISO 14583', size),
  recipe: (q, size, set) => { const L = len(set), n = `${size} pan`, m = matOf(set);
    return stack(`${size}×${n0(L)} pan head screw`, 1, [{ b: made(`${n} shank`, m, { cyl: [mm(q.d) / 2, L] }, { color: ZINC }) }, { b: made(`${n} head`, m, { lathe: { pts: panPts(mm(q.dk) / 2, mm(q.k)) } }, { color: ZINC }) }]); },
  expect: (q, _s, set) => { const L = len(set); return { bound: [mm(q.dk), L + mm(q.k), mm(q.dk)], mass: (disc(mm(q.d)) * L + turnedVol(panPts(mm(q.dk) / 2, mm(q.k)))) * rho(matOf(set)), tol: 0.01, massTol: 0.02, says: 'its head by its length and head; nominal mass, shank and head turned' }; },
  tests: [T(2, { offers: ['M4 pan head/axis', 'M4 pan shank/axis'] })],
};
type Wood = { d: number; dk: number };
const woodParts = (q: Wood, L: number) => { const d = mm(q.d), dk = mm(q.dk), k = (dk - d) / 2, p = 1.2 * d; return { d, dk, k, p, shank: L - k - p }; };
const WOODSCREW: PartFamily<Wood> = {
  id: 'piece.woodscrew', name: 'Wood screw', gloss: 'A countersunk wood screw by its diameter and length (typical)', domains: FAST,
  says: 'A countersunk wood screw (typical: its head about twice its thread, 90°; its point 1.2 d long): its point, its shank and its cone head, its thread and recess not drawn. Its shank offers its axis; it goes down a pilot hole (Through a line) and cuts its own way',
  rows: WOOD, size: '4', source: 'typical (DIN 7997\'s proportions)',
  settings: [{ key: 'length', label: 'Length (head included), mm', type: 'number', default: 30 }],
  cannot: (q, size, set) => above0(set, 'length', 'a length') ?? (woodParts(q, len(set)).shank > 0 ? null : `a ${size} mm wood screw longer than its head and point (${n0(woodParts(q, 0).k + woodParts(q, 0).p)} mm)`),
  recipe: (q, size, set) => { const w = woodParts(q, len(set)), n = `${size} wood screw`;
    return stack(`${size}×${n0(len(set))} wood screw`, 1, [{ b: made(`${n} point`, 'steel-low', { cone: [0, w.d / 2, w.p] }, { color: 0xc9a54a }) }, { b: made(`${n} shank`, 'steel-low', { cyl: [w.d / 2, w.shank] }, { color: 0xc9a54a }) }, { b: made(`${n} head`, 'steel-low', { cone: [w.d / 2, w.dk / 2, w.k] }, { color: 0xc9a54a }) }]); },
  expect: (q, _s, set) => { const w = woodParts(q, len(set)); return { bound: [w.dk, len(set), w.dk], mass: (frustum(0, w.d / 2, w.p) + disc(w.d) * w.shank + frustum(w.d / 2, w.dk / 2, w.k)) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its head by its length; nominal mass, point, shank and head' }; },
  tests: [T(3)],
};

// ---- threaded rod and nuts -----------------------------------------------------------------------------------------
const ROD: PartFamily<MetricSize> = {
  id: 'piece.threadedrod', name: 'Threaded rod', gloss: 'A metric threaded rod (DIN 975) by its size and length, with a nut at each end if asked', domains: FAST,
  says: 'A threaded rod (DIN 975; its thread not drawn: a rod of its size) so long, with an ISO 4032 nut slid over each end if asked. It offers its axis: nuts and washers slide over it (Over a shaft); it passes through holes',
  rows: Object.fromEntries(Object.entries(METRIC).filter(([, m]) => m.m !== undefined && m.s !== undefined)), size: 'M8', source: 'DIN 975 by the metric table (ISO 261, ISO 4032 nuts) as bd_warehouse gives it (src/nexus/parts/bdw.ts)',
  settings: [{ key: 'length', label: 'Length, mm', type: 'number', default: 200 }, { key: 'nuts', label: 'Nuts', type: 'choice', default: 'none', choices: ['none', 'both ends'] }],
  cannot: (m, size, set) => above0(set, 'length', 'a length') ?? (set.nuts === 'both ends' && len(set) < 2 * mm(m.m!) ? `a rod of ${size} at least two nuts long (${2 * m.m!} mm) for a nut at each end` : null),
  recipe: (m, size, set) => { const port = `${size} threaded rod/axis`; let b = made(`${size} threaded rod`, 'steel-low', { cyl: [mm(m.d) / 2, len(set)] }, { color: ZINC });
    if (set.nuts === 'both ends') b = over(over(b, port, hexNut(size), 'lo', 'touch'), port, hexNut(size), 'hi', 'touch');
    return set.nuts === 'both ends' ? stack(`${size}×${n0(len(set))} threaded rod and nuts`, 1, [{ b }]) : b; },
  expect: (m, _s, set) => { const L = len(set), nuts = set.nuts === 'both ends', W = nuts ? mm(corners(m.s!)) : mm(m.d);
    return { bound: [W, L, W], mass: (disc(mm(m.d)) * L + (nuts ? 2 * (hexA(mm(m.s!)) - disc(mm(m.d))) * mm(m.m!) : 0)) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its size by its length (and its nuts across corners); nominal mass, the rod drawn full (no thread) and its nuts' }; },
  tests: [T(1, { offers: ['M8 threaded rod/axis'] }), T(3, {}, { nuts: 'both ends' })],
};
type Flange = { d: number; c: number; dc: number; m: number; s: number };
const FLANGENUT: PartFamily<Flange> = {
  id: 'piece.flangenut', name: 'Flange nut', gloss: 'A hex nut with a flange (DIN 1665) by its size', domains: FAST,
  says: 'A hex flange nut (DIN 1665; its serrations not drawn): its flange and its hex above it, both bored to the thread\'s size; it slides over a bolt\'s shank (Over a shaft), its flange against what it holds',
  rows: Object.fromEntries(Object.entries(DIN1665).map(([k, r]) => [k, { d: dOf(k), ...r }])), size: 'M6', source: 'DIN 1665 as bd_warehouse gives it (copied here)',
  recipe: (q, size) => stack(`${size} flange nut`, 1, [{ b: made(`${size} flange nut flange`, 'steel-low', { tube: [mm(q.d) / 2, mm(q.dc) / 2, mm(q.c)] }, { color: ZINC }) }, { b: made(`${size} flange nut hex`, 'steel-low', { hex: [mm(q.s), mm(q.m - q.c), mm(q.d) / 2] }, { color: ZINC }) }]),
  expect: (q) => ({ bound: [mm(q.dc), mm(q.m), mm(q.dc)], mass: (annulus(mm(q.dc), mm(q.d)) * mm(q.c) + (hexA(mm(q.s)) - disc(mm(q.d))) * mm(q.m - q.c)) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its flange across by its height; nominal mass, flange and hex less their bore' }),
  tests: [T(2)],
};
type Nyloc = { d: number; s: number; m: number; h: number };
const NYLOC: PartFamily<Nyloc> = {
  id: 'piece.nyloc', name: 'Nyloc nut', gloss: 'A prevailing-torque hex nut with a nylon insert (ISO 7040) by its size', domains: FAST,
  says: 'A nyloc nut (ISO 7040): its steel hex (ISO 4032\'s height) and its nylon ring above it (the steel crimped round the ring not drawn: the ring drawn bare, its bore at the thread\'s size). It slides over a bolt\'s shank (Over a shaft)',
  rows: Object.fromEntries(Object.entries(ISO7040).filter(([k]) => METRIC[k]?.s !== undefined && METRIC[k]?.m !== undefined).map(([k, r]) => [k, { d: dOf(k), s: METRIC[k]!.s!, m: METRIC[k]!.m!, h: r.h }])), size: 'M6', source: 'ISO 7040 heights recalled from makers\' tables (typical); the hex by ISO 4032 (src/nexus/parts/bdw.ts)',
  recipe: (q, size) => stack(`${size} nyloc nut`, 1, [{ b: made(`${size} nyloc hex`, 'steel-low', { hex: [mm(q.s), mm(q.m), mm(q.d) / 2] }, { color: ZINC }) }, { b: made(`${size} nyloc ring`, 'nylon', { tube: [mm(q.d) / 2, mm(0.45 * q.s), mm(q.h - q.m)] }, { color: 0x2f5fd0 }) }]),
  expect: (q) => ({ bound: [mm(corners(q.s)), mm(q.h), mm(corners(q.s))], mass: (hexA(mm(q.s)) - disc(mm(q.d))) * mm(q.m) * rho('steel-low') + annulus(mm(0.9 * q.s), mm(q.d)) * mm(q.h - q.m) * rho('nylon'), tol: 0.01, massTol: 0.02, says: 'across corners by its height; nominal mass, the hex and its ring' }),
  tests: [T(2)],
};
type Sq = { d: number; m: number; s: number };
const SQUARENUT: PartFamily<Sq> = {
  id: 'piece.squarenut', name: 'Square nut', gloss: 'A square nut (DIN 557) by its size', domains: FAST,
  says: 'A square nut (DIN 557), its tapped hole drawn at the thread\'s size and offered as `<name>/thread`: a bolt goes through it (Through a line); it drops into a slot and cannot turn',
  rows: Object.fromEntries(Object.entries(DIN557).map(([k, r]) => [k, { d: dOf(k), ...r }])), size: 'M6', source: 'DIN 557 as bd_warehouse gives it (copied here)',
  recipe: (q, size) => made(`${size} square nut`, 'steel-low', { box: [mm(q.s), mm(q.m), mm(q.s)] }, { color: ZINC, pattern: { name: 'thread', points: [[0, 0]], hole: mm(q.d) / 2 } }),
  expect: (q) => ({ bound: [mm(q.s), mm(q.m), mm(q.s)], mass: (mm(q.s) ** 2 - disc(mm(q.d))) * mm(q.m) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its square by its height; nominal mass less its hole' }),
  tests: [T(1, { offers: ['M6 square nut/thread'] })],
};
type Wing = { d: number };
const wingOf = (d: number) => ({ e: 5.5 * d + 4, h: 1.5 * d + 2, tw: 0.35 * d + 1, lw: (5.5 * d + 4 - 2 * d) / 2 });
const WINGNUT: PartFamily<Wing> = {
  id: 'piece.wingnut', name: 'Wing nut', gloss: 'A wing nut (DIN 315 sizes, typical) by its size', domains: FAST,
  says: 'A wing nut (DIN 315, its sizes typical: wings 5.5 d + 4 tip to tip): its round hub bored to the thread\'s size and a wing each side, as high as the hub (drawn flat, not curved up). Its hub offers its axis; a bolt goes through it (Through a line; Over a shaft takes only a round sleeve)',
  rows: Object.fromEntries(['M3', 'M4', 'M5', 'M6', 'M8', 'M10', 'M12'].map((k) => [k, { d: dOf(k) }])), size: 'M6', source: 'typical (DIN 315\'s proportions, as src/nexus/kinds/fasteners.ts takes them)',
  settings: [{ key: 'matter', label: 'Made of', type: 'choice', default: 'zinc', choices: ['zinc', 'A2', 'nylon'] }],
  recipe: (q, size, set) => { const w = wingOf(q.d), m = matOf(set), wing = (i: number) => made(`${size} wing nut wing ${i}`, m, { box: [mm(w.lw), mm(w.h), mm(w.tw)] }, { color: ZINC });
    return stack(`${size} wing nut`, 0, [{ b: wing(1) }, { b: made(`${size} wing nut hub`, m, { tube: [mm(q.d) / 2, mm(q.d), mm(w.h)] }, { color: ZINC }) }, { b: wing(2) }]); },
  expect: (q, _s, set) => { const w = wingOf(q.d); return { bound: [mm(w.e), mm(w.h), mm(2 * q.d)], mass: (annulus(mm(2 * q.d), mm(q.d)) * mm(w.h) + 2 * mm(w.lw) * mm(w.h) * mm(w.tw)) * rho(matOf(set)), tol: 0.01, massTol: 0.02, says: 'tip to tip by its height and its hub; nominal mass, hub and wings' }; },
  tests: [T(3)],
};
type TNut = { d: number; slot: number; bw: number; bh: number; L: number; nw: number; nh: number };
const TNUT: PartFamily<TNut> = {
  id: 'piece.tnut', name: 'T-slot nut', gloss: 'A sliding T-slot nut for aluminium profile by its series and thread (typical)', domains: FAST,
  says: 'A sliding T-slot nut for aluminium profile (20, 30, 40 or 45 series; typical sizes): its body, that goes under the slot\'s lips, and its neck, in the slot\'s opening, on top, both tapped through at the thread\'s size (`<name> neck/thread`, `<name> body/thread`): a bolt through what is bolted to the profile goes down into it (Through a line)',
  rows: Object.fromEntries(Object.entries(TNUTS).map(([k, r]) => [k, { d: dOf(k.split(' ')[1]!), ...r }])), size: '20 M5', source: 'typical of makers\' sliding T-slot nuts',
  cannot: (q, size) => (q.d < q.nw ? null : `a ${size.split(' ')[1]} thread leaves no wall in a ${q.nw} mm neck`),
  recipe: (q, size) => { const n = `${size.split(' ')[1]} T-nut ${size.split(' ')[0]}`, hole = { name: 'thread', points: [[0, 0]] as [number, number][], hole: mm(q.d) / 2 };
    return stack(`${n} series`, 1, [{ b: made(`${n} body`, 'steel-low', { box: [mm(q.bw), mm(q.bh), mm(q.L)] }, { color: ZINC, pattern: hole }) }, { b: made(`${n} neck`, 'steel-low', { box: [mm(q.nw), mm(q.nh), mm(q.L)] }, { color: ZINC, pattern: hole }) }]); },
  expect: (q) => ({ bound: [mm(q.bw), mm(q.bh + q.nh), mm(q.L)], mass: ((mm(q.bw) * mm(q.bh) + mm(q.nw) * mm(q.nh)) * mm(q.L) - disc(mm(q.d)) * mm(q.bh + q.nh)) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its body by body and neck, its length; nominal mass less its hole' }),
  tests: [T(2, { offers: ['M5 T-nut 20 body/thread', 'M5 T-nut 20 neck/thread'] })],
};

// ---- rivets, pins, washers, inserts, standoffs ---------------------------------------------------------------------
type Rivet = { d: number; L: number; dk: number; k: number; dm: number };
const STEM = 25;
const RIVET: PartFamily<Rivet> = {
  id: 'piece.rivet', name: 'Blind rivet', gloss: 'A blind (pop) rivet by its diameter and length, as sold, its mandrel in it (typical of ISO 15983)', domains: FAST,
  says: 'A blind rivet as it is sold (ISO 15983\'s open-end rivets, its head and mandrel typical): its body and its head round its mandrel (Over a shaft), the mandrel standing 25 mm out of the head (its bulb under the body not drawn; set, it would swell the body\'s end). Its body goes down a hole of its diameter (Through a line)',
  rows: Object.fromEntries(Object.entries(RIVETS).flatMap(([d, r]) => r.L.map((L) => [`${d} × ${L}`, { d: Number(d), L, dk: r.dk, k: r.k, dm: r.dm }]))), size: '4 × 10', source: 'typical of ISO 15983; lengths as src/nexus/kinds/fasteners.ts gives them',
  settings: [{ key: 'matter', label: 'Made of', type: 'choice', default: 'aluminium', choices: ['aluminium', 'steel', 'stainless'] }],
  recipe: (q, size, set) => { const m = matOf(set), n = `${size} rivet`, dm = mm(q.dm) / 2;
    const mandrel = made(`${n} mandrel`, set.matter === 'stainless' ? 'stainless-304' : 'steel-low', { cyl: [dm, mm(q.L + q.k + STEM)] }, { color: 0x6e7175 });
    const body = stack(`${n} body and head`, 1, [{ b: made(`${n} body`, m, { tube: [dm, mm(q.d) / 2, mm(q.L)] }) }, { b: made(`${n} head`, m, { tube: [dm, mm(q.dk) / 2, mm(q.k)] }) }]);
    return stack(`blind rivet ${size}`, 1, [{ b: over(mandrel, `${n} mandrel/axis`, body, 'lo', 'touch') }]); },
  expect: (q, _s, set) => ({ bound: [mm(q.dk), mm(q.L + q.k + STEM), mm(q.dk)], mass: (annulus(mm(q.d), mm(q.dm)) * mm(q.L) + annulus(mm(q.dk), mm(q.dm)) * mm(q.k)) * rho(matOf(set)) + disc(mm(q.dm)) * mm(q.L + q.k + STEM) * rho(set.matter === 'stainless' ? 'stainless-304' : 'steel-low'), tol: 0.01, massTol: 0.02, says: 'its head across by its length, head and mandrel; nominal mass, body, head and mandrel' }),
  tests: [T(3)],
};
type Split = { d: number; dw: number; c: number };
const SPLITPIN: PartFamily<Split> = {
  id: 'piece.splitpin', name: 'Split pin', gloss: 'A split pin (cotter pin, ISO 1234) by the hole it goes in and its length', domains: FAST,
  says: 'A split pin (ISO 1234) by the hole it goes in: its two half-round legs drawn as one round rod, its eye under them drawn as a ring about the same axis (approximated: its loop and its split not drawn), not bent open. It goes through a pin\'s cross hole (Through a line), its eye left outside',
  rows: Object.fromEntries(Object.entries(ISO1234).map(([k, r]) => [k, { d: Number(k), ...r }])), size: '2', source: 'ISO 1234 recalled from makers\' tables (typical)',
  settings: [{ key: 'length', label: 'Length under its eye, mm', type: 'number', default: 20 }, { key: 'matter', label: 'Made of', type: 'choice', default: 'zinc', choices: ['zinc', 'A2'] }],
  cannot: (_q, _s, set) => above0(set, 'length', 'a length'),
  recipe: (q, size, set) => { const m = matOf(set), n = `${size} split pin`;
    return stack(`${size} × ${Number(set.length)} split pin`, 1, [{ b: made(`${n} eye`, m, { tube: [mm(q.c / 2 - 0.9 * q.dw), mm(q.c) / 2, mm(q.dw)] }, { color: ZINC }) }, { b: made(`${n} legs`, m, { cyl: [mm(q.dw) / 2, len(set)] }, { color: ZINC }) }]); },
  expect: (q, _s, set) => ({ bound: [mm(q.c), len(set) + mm(q.dw), mm(q.c)], mass: (disc(mm(q.dw)) * len(set) + annulus(mm(q.c), mm(q.c - 1.8 * q.dw)) * mm(q.dw)) * rho(matOf(set)), tol: 0.01, massTol: 0.02, says: 'its eye across by its legs and eye; nominal mass, rod and ring' }),
  tests: [T(2)],
};
type Clevis = { d: number; dk: number; k: number; d1: number; le: number };
const CLEVISPIN: PartFamily<Clevis> = {
  id: 'piece.clevispin', name: 'Clevis pin', gloss: 'A headed clevis pin with a split pin hole (ISO 2341 B) by its diameter and length', domains: FAST,
  says: 'A clevis pin (ISO 2341 B): its pin, its head on top, and its cross hole near its end, offered as `<name>/cross` (along x), for a split pin (Through a line). Its pin offers its axis; it goes through a fork\'s holes and what pivots in it',
  rows: Object.fromEntries(Object.entries(ISO2341).map(([k, r]) => [k, { d: Number(k), ...r }])), size: '6', source: 'ISO 2341 B recalled from makers\' tables (typical)',
  settings: [{ key: 'length', label: 'Length under its head, mm', type: 'number', default: 24 }, { key: 'matter', label: 'Made of', type: 'choice', default: 'steel', choices: ['steel', 'stainless'] }],
  cannot: (q, size, set) => above0(set, 'length', 'a length') ?? (Number(set.length) > q.le + q.d1 + 0.5 ? null : `a ${size} mm clevis pin longer than its cross hole's place (${q.le + q.d1 + 0.5} mm)`),
  recipe: (q, size, set) => { const m = matOf(set), L = len(set), n = `Ø${size} clevis pin`;
    return stack(`Ø${size} × ${Number(set.length)} clevis pin`, 1, [{ b: made(n, m, { cyl: [mm(q.d) / 2, L] }, { pattern: { name: 'cross', points: [[-L / 2 + mm(q.le + q.d1 / 2), 0]], hole: mm(q.d1) / 2, face: '+x' } }) }, { b: made(`${n} head`, m, { cyl: [mm(q.dk) / 2, mm(q.k)] }) }]); },
  expect: (q, _s, set) => ({ bound: [mm(q.dk), len(set) + mm(q.k), mm(q.dk)], mass: (disc(mm(q.d)) * len(set) + disc(mm(q.dk)) * mm(q.k) - disc(mm(q.d1)) * mm(q.d)) * rho(matOf(set)), tol: 0.01, massTol: 0.02, says: 'its head across by pin and head; nominal mass less its cross hole (drawn as a cylinder its pin across)' }),
  tests: [T(2, { offers: ['Ø6 clevis pin head/axis', 'Ø6 clevis pin/axis', 'Ø6 clevis pin/cross'] })],
};
const SPRINGWASHER: PartFamily<{ d1: number; d2: number; s: number }> = {
  id: 'piece.lockwasher', name: 'Split lock washer', gloss: 'A split lock washer (DIN 127 B) by its size', domains: FAST,
  says: 'A split lock washer (DIN 127 B): drawn flat at its thickness, its split and its set (its free height) not drawn. It slides over a bolt\'s shank under its nut or head (Over a shaft)',
  rows: DIN127, size: 'M6', source: 'DIN 127 B as src/nexus/kinds/fasteners.ts gives it',
  recipe: (q, size) => made(`${size} lock washer`, 'steel-spring', { tube: [mm(q.d1) / 2, mm(q.d2) / 2, mm(q.s)] }, { color: DARK }),
  expect: (q) => ({ bound: [mm(q.d2), mm(q.s), mm(q.d2)], mass: annulus(mm(q.d2), mm(q.d1)) * mm(q.s) * rho('steel-spring'), tol: 0.01, massTol: 0.02, says: 'its outside by its thickness; nominal mass, the ring' }),
  tests: [T(1, { offers: ['M6 lock washer/axis'] })],
};
type Heat = { s: number; m: number; dc: number; knurls: number; wall: number; maker: string; part: string };
const HEATSETS: PartFamily<Heat> = {
  id: 'piece.heatset', name: 'Heat-set insert', gloss: 'A brass heat-set threaded insert for plastic, by its maker\'s row', domains: FAST,
  says: 'A brass heat-set insert by its maker\'s own row (McMaster-Carr, Hilitchi, AE-SamZhihui): drawn as a sleeve at its knurl\'s crest, its bore the thread\'s size (its knurl and thread not drawn). Pressed hot down a plastic part\'s hole (Through a line, tight); a screw then goes down its bore',
  rows: HEATSET, size: 'M3-0.5-Standard McMaster-Carr', source: 'each maker\'s row as bd_warehouse gives it (copied here)',
  cannot: (q, size) => (dOf(size) < q.s ? null : `its row leaves no wall round an ${dOf(size)} mm thread (${q.s} mm outside)`),
  recipe: (q, size) => made(`${size.split('-')[0]} heat-set insert ${q.m} mm`, 'brass', { tube: [mm(dOf(size)) / 2, mm(q.s) / 2, mm(q.m)] }),
  expect: (q, size) => ({ bound: [mm(q.s), mm(q.m), mm(q.s)], mass: annulus(mm(q.s), mm(dOf(size))) * mm(q.m) * rho('brass'), tol: 0.01, massTol: 0.02, says: 'its crest by its length; nominal mass, the sleeve at its crest' }),
  tests: [T(1, { offers: ['M3 heat-set insert 5.7 mm/axis'] })],
};
const STANDOFF: PartFamily<{ d: number; af: number; stud: number }> = {
  id: 'piece.hexstandoff', name: 'Hex standoff', gloss: 'A hex standoff, male-female or female-female, M2.5 to M4, by its length (typical)', domains: [...FAST, 'electrical'],
  says: 'A hex standoff (typical sizes): its hex body, tapped through (female-female) or tapped from its top with a stud under it (male-female; the stud\'s thread not drawn). It stands a board off a plate: its stud through the plate\'s hole, a board\'s screw down its top (Through a line)',
  rows: Object.fromEntries(Object.entries(STANDOFFS).map(([k, r]) => [k, { d: dOf(k), ...r }])), size: 'M3', source: 'typical of makers\' hex standoffs',
  settings: [{ key: 'length', label: 'Body length, mm', type: 'number', default: 10 }, { key: 'form', label: 'Form', type: 'choice', default: 'male-female', choices: ['male-female', 'female-female'] }, { key: 'matter', label: 'Made of', type: 'choice', default: 'brass', choices: ['brass', 'nylon', 'stainless'] }],
  cannot: (q, size, set) => above0(set, 'length', 'a body length') ?? (set.form === 'male-female' && Number(set.length) < 1.5 * q.d + 1 ? `a male-female ${size} standoff at least ${1.5 * q.d + 1} mm long (its tapped depth and a floor)` : null),
  recipe: (q, size, set) => { const m = matOf(set, 'matter', 'brass'), L = len(set), n = `${size} standoff`;
    if (set.form === 'female-female') return made(`${n} ${n0(L)} mm`, m, { hex: [mm(q.af), L, mm(q.d) / 2] });
    return stack(`${n} ${n0(L)} mm male-female`, 1, [{ b: made(`${n} stud`, m, { cyl: [mm(q.d) / 2, mm(q.stud)] }) }, { b: made(`${n} body`, m, { hex: [mm(q.af), L] }, { pattern: { name: 'thread', points: [[0, 0]], hole: mm(q.d) / 2, face: '+y', depth: mm(1.5 * q.d) } }) }]); },
  expect: (q, _s, set) => { const L = len(set), mf = set.form !== 'female-female', m = matOf(set, 'matter', 'brass');
    return { bound: [mm(corners(q.af)), L + (mf ? mm(q.stud) : 0), mm(corners(q.af))], mass: (hexA(mm(q.af)) * L - disc(mm(q.d)) * (mf ? mm(1.5 * q.d) : L) + (mf ? disc(mm(q.d)) * mm(q.stud) : 0)) * rho(m), tol: 0.01, massTol: 0.02, says: 'across corners by body and stud; nominal mass less its tapped hole' }; },
  tests: [T(2, { offers: ['M3 standoff body/axis', 'M3 standoff body/thread', 'M3 standoff stud/axis'] }), T(1, {}, { form: 'female-female' })],
};

// ---- magnets --------------------------------------------------------------------------------------------------------
const GRADE: { key: string; label: string; type: 'choice'; default: string; choices: string[] } = { key: 'grade', label: 'Grade', type: 'choice', default: 'N42', choices: Object.keys(NDFEB) };
const MAGNET: PartFamily<{ d: number; h: number }> = {
  id: 'piece.magnet', name: 'Disc magnet', gloss: 'A nickel-plated NdFeB disc magnet by its stock size and grade', domains: ['electrical', 'mechanical', 'everyday'],
  says: 'An NdFeB disc magnet, magnetised through its height (its grade\'s remanence in what it says; its plating not drawn). It offers its axis; it goes into a pocket (Into a room) or over a pin',
  rows: MAG_DISCS, size: '10x3', source: 'typical stock sizes; grades from src/nexus/families.ts (NDFEB)', settings: [GRADE],
  recipe: (q, size, set) => made(`${size} mm ${String(set.grade)} disc magnet (Br about ${NDFEB[String(set.grade)] ?? '?'} T)`, 'ndfeb', { cyl: [mm(q.d) / 2, mm(q.h)] }),
  cannot: (_q, _s, set) => (NDFEB[String(set.grade)] ? null : `a grade of ${Object.keys(NDFEB).join(', ')}`),
  expect: (q) => ({ bound: [mm(q.d), mm(q.h), mm(q.d)], mass: disc(mm(q.d)) * mm(q.h) * rho('ndfeb'), tol: 0.01, massTol: 0.02, says: 'its diameter by its height; nominal mass at 7.5 g/cm³' }),
  tests: [T(1)],
};
const MAGNETBLOCK: PartFamily<{ L: number; W: number; h: number }> = {
  id: 'piece.magnetblock', name: 'Block magnet', gloss: 'A nickel-plated NdFeB block magnet by its stock size and grade', domains: ['electrical', 'mechanical', 'everyday'],
  says: 'An NdFeB block magnet L × W × h, magnetised through h (up; its plating not drawn). It goes into a pocket (Into a room) or stacks on a face (Onto a face)',
  rows: MAG_BLOCKS, size: '20x10x3', source: 'typical stock sizes; grades from src/nexus/families.ts (NDFEB)', settings: [GRADE],
  cannot: (_q, _s, set) => (NDFEB[String(set.grade)] ? null : `a grade of ${Object.keys(NDFEB).join(', ')}`),
  recipe: (q, size, set) => made(`${size} mm ${String(set.grade)} block magnet`, 'ndfeb', { box: [mm(q.L), mm(q.h), mm(q.W)] }),
  expect: (q) => ({ bound: [mm(q.L), mm(q.h), mm(q.W)], mass: mm(q.L) * mm(q.W) * mm(q.h) * rho('ndfeb'), tol: 0.01, massTol: 0.02, says: 'its three sizes; nominal mass at 7.5 g/cm³' }),
  tests: [T(1)],
};

// ---- door, drawer and cabinet hardware -----------------------------------------------------------------------------
// (a bar handle's outline, its left leg's outer bottom corner at its own origin, so it offers no line along z)
const handlePts = (c: number): [number, number][] => { const L = c + 24, x = (v: number) => mm(v + c / 2 + 6), y = mm;
  return [[x(-c / 2 - 6), y(0)], [x(-c / 2 + 6), y(0)], [x(-c / 2 + 6), y(23)], [x(c / 2 - 6), y(23)], [x(c / 2 - 6), y(0)], [x(c / 2 + 6), y(0)], [x(c / 2 + 6), y(23)], [x(L / 2), y(23)], [x(L / 2), y(35)], [x(-L / 2), y(35)], [x(-L / 2), y(23)], [x(-c / 2 - 6), y(23)]]; };
const HANDLE: PartFamily<{ c: number }> = {
  id: 'piece.handle', name: 'Pull handle', gloss: 'A bar pull handle by its screws\' centres on the 32 mm system (typical)', domains: ['mechanical', 'everyday', 'structural'],
  says: 'A bar pull handle on the 32 mm system: its bar on two legs (12 × 12 in section, standing 35 off the face, typical), its legs tapped M4 10 deep from below, offered as `<name>/screw holes`: screws from behind the drawer front go up into them (Through a line)',
  rows: HANDLES, size: '128', source: 'the 32 mm system\'s centres; the handle typical',
  settings: [{ key: 'matter', label: 'Made of', type: 'choice', default: 'zamak', choices: ['zamak', 'stainless', 'aluminium'] }],
  recipe: (q, _s, set) => made(`pull handle ${q.c} mm`, matOf(set, 'matter', 'zamak'), { section: { pts: handlePts(q.c), L: mm(12) } }, { color: 0xb8bcc2, pattern: { name: 'screw holes', points: [[mm(-q.c / 2), 0], [mm(q.c / 2), 0]], hole: mm(3.3) / 2, face: '-y', depth: mm(10) } }),
  expect: (q, _s, set) => ({ bound: [mm(q.c + 24), mm(35), mm(12)], mass: (areaOf(handlePts(q.c)) * mm(12) - 2 * disc(mm(3.3)) * mm(10)) * rho(matOf(set, 'matter', 'zamak')), tol: 0.01, massTol: 0.02, says: 'its bar\'s length by its height and section; nominal mass, its outline along its section less its tapped holes' }),
  tests: [T(1, { offers: ['pull handle 128 mm/screw holes'] })],
};
/** A star knob's outline: five lobes, D across at their tips, 0.6 D at their roots, about its own origin. */
const starPts = (D: number): [number, number][] => Array.from({ length: 80 }, (_, i) => { const t = (2 * Math.PI * i) / 80, r = mm(D / 2) * (0.8 + 0.2 * Math.cos(5 * t)); return [r * Math.cos(t), r * Math.sin(t)] as [number, number]; });
// (the outline with a round bore joined to it by a cut of no width, the bore's polygon round its circle, so the line
// through it has the bore's radius whole)
const boredStar = (D: number, rb: number): [number, number][] => { const o = starPts(D), K = 32, R = rb / Math.cos(Math.PI / K); return [...o, o[0]!, ...Array.from({ length: K }, (_, k) => { const a = (-2 * Math.PI * k) / K; return [R * Math.cos(a), R * Math.sin(a)] as [number, number]; }), [R, 0]]; };
const insertOf = (d: number) => ({ ro: mm(0.8 * d + 0.5), L: (D: number) => mm(0.42 * D) });
const span = (pts: [number, number][], k: 0 | 1) => Math.max(...pts.map((p) => p[k])) - Math.min(...pts.map((p) => p[k]));
const STARKNOB: PartFamily<{ d: number; D: number; stud: number }> = {
  id: 'piece.starknob', name: 'Star knob', gloss: 'A five-lobed star knob (DIN 6336 sizes) on a threaded stud or a threaded insert', domains: ['mechanical', 'everyday'],
  says: 'A star knob (DIN 6336\'s diameters; its thickness 0.6 D, its stud and insert typical): its five-lobed grip of phenolic, standing up, and a steel stud down from it (male) or a brass insert in its bore (female, offered as `<name> insert/axis`, the thread drawn at its size): a bolt goes up into the insert, the stud through a hole (Through a line)',
  rows: Object.fromEntries(Object.entries(DIN6336).map(([k, r]) => [k, { d: dOf(k), ...r }])), size: 'M8', source: 'DIN 6336 diameters as src/nexus/kinds/stock.ts gives them; the rest typical',
  settings: [{ key: 'form', label: 'Form', type: 'choice', default: 'female', choices: ['female', 'male'] }],
  recipe: (q, size, set) => { const H = mm(0.6 * q.D), n = `${size} star knob`;
    if (set.form === 'male') { const stud = turn(made(`${n} stud`, 'steel-low', { cyl: [mm(q.d) / 2, mm(q.stud)] }), 0, 90);
      return turn(stack(`${n}, stud`, 2, [{ b: made(`${n} grip`, 'phenolic', { section: { pts: starPts(q.D), L: H } }, { color: 0x1c1c1c }) }, { b: stud }], `${n} grip/axis`), 0, 90); }
    const ins = insertOf(q.d), grip = made(`${n} grip`, 'phenolic', { section: { pts: boredStar(q.D, ins.ro), L: H } }, { color: 0x1c1c1c });
    return turn(through(grip, made(`${n} insert`, 'brass', { tube: [mm(q.d) / 2, ins.ro, ins.L(q.D)] }), { port: `${n} grip/axis`, from: 'hi' }, 'tight'), 0, 90, `${n}, insert`); },
  expect: (q, _s, set) => { const H = mm(0.6 * q.D), male = set.form === 'male', o = starPts(q.D), ins = insertOf(q.d);
    return { bound: [span(o, 0), H + (male ? mm(q.stud) : 0), span(o, 1)], mass: male ? areaOf(o) * H * rho('phenolic') + disc(mm(q.d)) * mm(q.stud) * rho('steel-low') : areaOf(boredStar(q.D, ins.ro)) * H * rho('phenolic') + (Math.PI * (ins.ro ** 2 - mm(q.d / 2) ** 2)) * ins.L(q.D) * rho('brass'), tol: 0.01, massTol: 0.02, says: 'its lobes\' span by its thickness and stud; nominal mass, its outline along its thickness and its stud or insert' }; },
  tests: [T(2), T(2, {}, { form: 'male' })],
};
const BUMPER: PartFamily<{ D: number; h: number }> = {
  id: 'piece.bumper', name: 'Bumper', gloss: 'A self-adhesive domed bumper (rubber foot) by its diameter and height (typical)', domains: ['mechanical', 'everyday'],
  says: 'A self-adhesive domed bumper of polyurethane: a spherical cap of its diameter and height (its adhesive not drawn). It stacks under a box\'s floor (Onto a face)',
  rows: BUMPERS, size: '12.7x3.5', source: 'typical sizes sold',
  cannot: (q) => (q.h <= q.D / 2 ? null : `a dome no higher than half across (${q.D / 2} mm)`),
  recipe: (q, size) => made(`${size} mm bumper`, 'pu', { lathe: { pts: capPts(mm(q.D) / 2, mm(q.h)) } }, { color: 0x1c1c1c }),
  expect: (q) => ({ bound: [mm(q.D), mm(q.h), mm(q.D)], mass: turnedVol(capPts(mm(q.D) / 2, mm(q.h))) * rho('pu'), tol: 0.01, massTol: 0.02, says: 'its diameter by its height; nominal mass, the cap' }),
  tests: [T(1)],
};
const footCb = (q: { D: number; H: number; screw: string }) => { const m = METRIC[q.screw]!; return { r: mm(m.clear!) / 2, R: mm(m.d2!) / 2 + mm(0.5), depth: mm(0.45 * q.H) }; };
const FOOT: PartFamily<{ D: number; H: number; screw: string }> = {
  id: 'piece.foot', name: 'Rubber foot', gloss: 'A screw-on rubber foot, a frustum counterbored for its screw (typical)', domains: ['mechanical', 'everyday'],
  says: 'A screw-on rubber foot: a frustum D across at the floor, 0.8 D at the top, its screw\'s clearance hole up through it counterbored from below for the screw\'s head and washer (`<name>/screw`). Stack the box on it (Stack), then its screw up through it into the box (Through a line)',
  rows: FEET, size: '20x10', source: 'typical',
  recipe: (q, size) => { const c = footCb(q); return made(`${size} mm rubber foot`, 'rubber', { cone: [mm(q.D) / 2, mm(0.8 * q.D) / 2, mm(q.H)] }, { color: 0x1c1c1c, pattern: { name: 'screw', points: [[0, 0]], hole: c.r, face: '-y', sink: { cbore: [c.R, c.depth] } } }); },
  expect: (q) => { const c = footCb(q); return { bound: [mm(q.D), mm(q.H), mm(q.D)], mass: (frustum(mm(q.D) / 2, mm(0.8 * q.D) / 2, mm(q.H)) - Math.PI * c.r * c.r * (mm(q.H) - c.depth) - Math.PI * c.R * c.R * c.depth) * rho('rubber'), tol: 0.01, massTol: 0.02, says: 'its floor diameter by its height; nominal mass less its hole and counterbore' }; },
  tests: [T(1, { offers: ['20x10 mm rubber foot/axis', '20x10 mm rubber foot/screw'] })],
};
// (a slide's member: a C of 1.2 mm sheet 45 high and 6.35 deep, its opening toward +x or −x)
const memberPts = (open: 1 | -1): [number, number][] => { const t = mm(1.2), w = mm(6.35), h = mm(45); return ([[0, 0], [w, 0], [w, t], [t, t], [t, h - t], [w, h - t], [w, h], [0, h]] as [number, number][]).map(([x, y]) => [open * x, y]); };
const SLIDE: PartFamily<{ L: number }> = {
  id: 'piece.drawerslide', name: 'Drawer slide', gloss: 'A full-extension ball-bearing drawer slide by its length (typical)', domains: ['mechanical', 'everyday', 'structural'],
  says: 'One full-extension drawer slide (sold in pairs; its sections typical): its cabinet member and its drawer member, each a C of 1.2 mm steel, face to face, closed; each member\'s three screw holes along its web (`<name> cabinet member/holes` along +x, `<name> drawer member/holes` along −x) for screws into the cabinet\'s side and the drawer\'s. Its balls and middle member not drawn, its travel not a joint (joints slide along y only)',
  rows: SLIDES, size: '450', source: 'lengths as sold (src/nexus/kinds/stock.ts); sections typical',
  settings: [{ key: 'kg', label: 'Load a pair, kg', type: 'choice', default: '45', choices: ['35', '45'] }],
  recipe: (q) => { const L = mm(q.L), pts: [number, number][] = [[0, -L / 2 + mm(37)], [0, 0], [0, L / 2 - mm(37)]], n = `drawer slide ${q.L} mm`;
    const member = (which: string, open: 1 | -1) => made(`${n} ${which} member`, 'steel-low', { section: { pts: memberPts(open), L } }, { color: 0x8a8c90, pattern: { name: 'holes', points: pts, hole: mm(4.5) / 2, face: open === 1 ? '-x' : '+x', depth: mm(1.2) } });
    return stack(n, 0, [{ b: member('cabinet', 1) }, { b: member('drawer', -1) }]); },
  expect: (q) => ({ bound: [mm(12.7), mm(45), mm(q.L)], mass: 2 * (areaOf(memberPts(1)) * mm(q.L) - 3 * disc(mm(4.5)) * mm(1.2)) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its two members across by its height and length; nominal mass, the two Cs less their holes' }),
  tests: [T(2, { offers: ['drawer slide 450 mm cabinet member/holes', 'drawer slide 450 mm drawer member/holes'] })],
};
type Strut = { r: number; b: number; sMax: number; F: [number, number]; wall: number; eye: number };
const GASSTRUT: PartFamily<Strut> = {
  id: 'piece.gasstrut', name: 'Gas strut', gloss: 'A gas spring by its rod and body, its stroke and force, drawn extended (typical)', domains: ['mechanical', 'everyday', 'vehicles'],
  says: 'A gas spring, drawn extended (2 s + 4 b long; typical): its body eye, its body tube, its gland round its rod (Over a shaft), its rod out by its stroke, its rod eye on its end; each eye\'s cross hole (`<name> body eye/eye`, `<name> rod eye/eye`, along x) for its pin or ball stud. Its gas, piston and oil not drawn; its force in what it says, not modelled',
  rows: GASSTRUTS, size: '8/18', source: 'sizes and strokes as src/nexus/kinds/motion.ts gives them; walls and eyes typical',
  settings: [{ key: 'stroke', label: 'Stroke, mm', type: 'number', default: 100 }, { key: 'force', label: 'Force, N', type: 'number', default: 200 }],
  cannot: (q, size, set) => { const s = Number(set.stroke), F = Number(set.force); return !(s >= 20 && s <= q.sMax) ? `a ${size} gas spring's stroke 20 to ${q.sMax} mm (${String(set.stroke)} asked)` : !(F >= q.F[0] && F <= q.F[1]) ? `a ${size} gas spring's force ${q.F[0]} to ${q.F[1]} N (${String(set.force)} asked)` : null; },
  recipe: (q, size, set) => { const s = mm(Number(set.stroke)), b = mm(q.b), n = `gas strut ${size}`;
    const eye = (which: string) => made(`${n} ${which} eye`, 'steel-low', { cyl: [b / 2, b] }, { color: 0x2b2d30, pattern: { name: 'eye', points: [[0, 0]], hole: mm(q.eye) / 2, face: '+x' } });
    const rod = over(made(`${n} rod`, 'steel-alloy', { cyl: [mm(q.r) / 2, s + b / 2] }, { color: 0xd8dade }), `${n} rod/axis`, made(`${n} gland`, 'steel-low', { tube: [mm(q.r) / 2 + 0.00025, b / 2, b / 2] }, { color: 0x2b2d30 }), 'lo', 'slide');
    const body = stack(`${n}, ${Number(set.stroke)} mm, ${Number(set.force)} N`, 1, [{ b: eye('body') }, { b: made(`${n} body`, 'steel-low', { tube: [b / 2 - mm(q.wall), b / 2, s + 1.5 * b] }, { color: 0x2b2d30 }) }, { b: rod }]);
    return onto(body, '+y', eye('rod'), 'touch', `${n} rod/axis`); },
  expect: (q, _s, set) => { const s = mm(Number(set.stroke)), b = mm(q.b), r = mm(q.r);
    return { bound: [b, 2 * s + 4 * b, b], mass: (2 * (disc(b) - disc(mm(q.eye))) * b + annulus(b, b - 2 * mm(q.wall)) * (s + 1.5 * b) + annulus(b, r + 0.0005) * (b / 2)) * rho('steel-low') + disc(r) * (s + b / 2) * rho('steel-alloy'), tol: 0.01, massTol: 0.02, says: 'its body across by its extended length; nominal mass, eyes, body, gland and rod' }; },
  tests: [T(5)],
};
type Piano = { t: number; od: number; pin: number };
const pianoHoles = (L: number) => Math.max(2, Math.round(L / 50));
const PIANOHINGE: PartFamily<Piano> = {
  id: 'piece.pianohinge', name: 'Piano hinge', gloss: 'A continuous (piano) hinge by its open width, cut to length (typical)', domains: ['mechanical', 'everyday', 'structural'],
  says: 'A piano hinge opened flat, cut to its length: its knuckles drawn as one tube round its pin (Over a shaft), a leaf each side, each with its screw holes (Ø3.5 every 50 mm, typical), offered as `<name> leaf 1/screw holes` and `… leaf 2/screw holes`, up through each leaf: screws down into a lid and its box (Through a line). Its turn about its pin is not a joint yet',
  rows: PIANO, size: '32', source: 'typical',
  settings: [{ key: 'length', label: 'Length, mm', type: 'number', default: 300 }, { key: 'matter', label: 'Made of', type: 'choice', default: 'steel', choices: ['steel', 'stainless', 'aluminium'] }],
  cannot: (q, size, set) => above0(set, 'length', 'a length') ?? (Number(set.length) >= 30 ? null : `a ${size} mm piano hinge at least 30 mm long`),
  recipe: (q, size, set) => { const L = len(set), m = matOf(set), n = `piano hinge ${size}×${Number(set.length)}`, lw = (mm(Number(size)) - mm(q.od)) / 2, k = pianoHoles(Number(set.length));
    const knuckle = over(made(`${n} pin`, 'steel-low', { cyl: [mm(q.pin) / 2, L] }), `${n} pin/axis`, made(`${n} knuckle`, m, { tube: [mm(q.pin) / 2 + 0.00025, mm(q.od) / 2, L] }), 'lo', 'slide');
    const leaf = (i: number) => made(`${n} leaf ${i}`, m, { box: [lw, L, mm(q.t)] }, { pattern: { name: 'screw holes', points: Array.from({ length: k }, (_, j) => [0, -L / 2 + ((j + 0.5) * L) / k] as [number, number]), hole: mm(3.5) / 2, face: '+z' } });
    return turn(stack(n, 0, [{ b: leaf(1) }, { b: knuckle }, { b: leaf(2) }]), 0, 90); },
  expect: (q, size, set) => { const L = len(set), lw = (mm(Number(size)) - mm(q.od)) / 2, k = pianoHoles(Number(set.length));
    return { bound: [mm(Number(size)), mm(q.od), L], mass: (2 * (lw * L - k * disc(mm(3.5))) * mm(q.t) + annulus(mm(q.od), mm(q.pin) + 0.0005) * L) * rho(matOf(set)) + disc(mm(q.pin)) * L * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its open width by its knuckle and length; nominal mass, leaves less holes, knuckle and pin' }; },
  tests: [T(4)],
};
const TIE: PartFamily<{ L: number; w: number; t: number }> = {
  id: 'piece.cabletie', name: 'Cable tie', gloss: 'A nylon cable tie by its length and width, straight as sold', domains: ['electrical', 'everyday', 'mechanical'],
  says: 'A nylon cable tie, straight as sold (its thickness typical): its head with the slot its strap goes back through (drawn round, along y: `<name> head/slot`) and its strap. Closed round a bundle is not drawn (a strap bent round is not an operation yet)',
  rows: TIES, size: '200x4.8', source: 'sizes as src/nexus/kinds/fasteners.ts gives them; thickness typical',
  settings: [{ key: 'colour', label: 'Colour', type: 'choice', default: 'natural', choices: ['natural', 'black'] }],
  recipe: (q, size, set) => { const n = `${size} cable tie`, w = mm(q.w), t = mm(q.t), c = set.colour === 'black' ? 0x1c1c1c : 0xe8e4d8;
    return stack(n, 2, [{ b: made(`${n} head`, 'nylon', { box: [w + mm(2), 2 * t + mm(2.5), w + mm(2)] }, { color: c, pattern: { name: 'slot', points: [[0, 0]], hole: w / 2 } }) }, { b: made(`${n} strap`, 'nylon', { box: [w, t, mm(q.L) - w - mm(2)] }, { color: c }) }]); },
  expect: (q) => { const w = mm(q.w), t = mm(q.t); return { bound: [w + mm(2), 2 * t + mm(2.5), mm(q.L)], mass: (((w + mm(2)) ** 2 - disc(w)) * (2 * t + mm(2.5)) + w * t * (mm(q.L) - w - mm(2))) * rho('nylon'), tol: 0.01, massTol: 0.02, says: 'its head by its length; nominal mass, head less slot and strap' }; },
  tests: [T(2, { offers: ['200x4.8 cable tie head/slot'] })],
};

// ---- more of the same kinds: shoulder and carriage bolts, cap nuts, large washers, spring pins, rivet nuts, wall plugs
type Shoulder = { d: number; ds: number; dk: number; k: number; b: number; s: number; t: number; L: [number, number] };
const SHOULDER: PartFamily<Shoulder> = {
  id: 'piece.shoulderscrew', name: 'Shoulder screw', gloss: 'A hex socket shoulder screw (ISO 7379) by its thread and shoulder length', domains: FAST,
  says: 'A shoulder screw (ISO 7379): its thread (not drawn: a rod of its size), its ground shoulder and its socket head (its socket drawn round). Its shoulder offers its axis: a bearing, a lever or a pulley turns on it (Over a shaft), its thread goes down a tapped hole (Through a line)',
  rows: Object.fromEntries(Object.entries(ISO7379).map(([k, r]) => [k, { d: dOf(k), ...r }])), size: 'M6', source: 'ISO 7379 as bd_warehouse gives it (copied here)',
  settings: [{ key: 'length', label: 'Shoulder length, mm', type: 'number', default: 20 }],
  cannot: (q, size, set) => lenIn(q.L, set, 'ISO 7379', size),
  recipe: (q, size, set) => { const n = `${size} shoulder screw`;
    return stack(`${size} × ${Number(set.length)} shoulder screw`, 1, [{ b: made(`${n} thread`, 'steel-alloy', { cyl: [mm(q.d) / 2, mm(q.b)] }, { color: DARK }) }, { b: made(`${n} shoulder`, 'steel-alloy', { cyl: [mm(q.ds) / 2, len(set)] }, { color: DARK }) },
      { b: made(`${n} head`, 'steel-alloy', { cyl: [mm(q.dk) / 2, mm(q.k)] }, { color: DARK, pattern: { name: 'socket', points: [[0, 0]], hole: mm(q.s) / Math.sqrt(3), face: '+y', depth: mm(q.t) } }) }]); },
  expect: (q, _s, set) => { const sk = mm(q.s) / Math.sqrt(3); return { bound: [mm(q.dk), mm(q.b) + len(set) + mm(q.k), mm(q.dk)], mass: (disc(mm(q.d)) * mm(q.b) + disc(mm(q.ds)) * len(set) + disc(mm(q.dk)) * mm(q.k) - Math.PI * sk * sk * mm(q.t)) * rho('steel-alloy'), tol: 0.01, massTol: 0.02, says: 'its head across by thread, shoulder and head; nominal mass less its socket' }; },
  tests: [T(3)],
};
const CARRIAGEBOLT: PartFamily<{ d: number }> = {
  id: 'piece.carriagebolt', name: 'Carriage bolt', gloss: 'A cup square (carriage) bolt by its size and length (DIN 603\'s proportions, typical)', domains: FAST,
  says: 'A carriage bolt (DIN 603\'s proportions, typical): its shank, its square neck that bites into wood so it cannot turn, and its low dome. Its shank offers its axis; it goes down a hole in timber (Through a line), a washer and nut over its end',
  rows: CARRIAGE, size: 'M8', source: 'typical (DIN 603\'s proportions)',
  settings: [{ key: 'length', label: 'Length under the head, mm', type: 'number', default: 60 }],
  cannot: (q, size, set) => above0(set, 'length', 'a length') ?? (Number(set.length) > 0.6 * q.d + 1 ? null : `a ${size} carriage bolt longer than its neck (${0.6 * q.d} mm)`),
  recipe: (q, size, set) => { const d = mm(q.d), n = `${size} carriage bolt`;
    return stack(`${size} × ${Number(set.length)} carriage bolt`, 1, [{ b: made(`${n} shank`, 'steel-low', { cyl: [d / 2, len(set) - 0.6 * d] }, { color: ZINC }) }, { b: made(`${n} neck`, 'steel-low', { box: [d, 0.6 * d, d] }, { color: ZINC }) }, { b: made(`${n} head`, 'steel-low', { lathe: { pts: capPts(1.25 * d, 0.55 * d) } }, { color: ZINC }) }]); },
  expect: (q, _s, set) => { const d = mm(q.d); return { bound: [2.5 * d, len(set) + 0.55 * d, 2.5 * d], mass: (disc(d) * (len(set) - 0.6 * d) + d * d * 0.6 * d + turnedVol(capPts(1.25 * d, 0.55 * d))) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its dome across by its length and dome; nominal mass, shank, neck and dome' }; },
  tests: [T(3)],
};
const CAPNUT: PartFamily<{ d: number; dk: number; m: number; s: number }> = {
  id: 'piece.capnut', name: 'Cap nut', gloss: 'A domed cap (acorn) nut (DIN 1587) by its size', domains: FAST,
  says: 'A domed cap nut (DIN 1587): its hex, bored to the thread\'s size through its height, and its dome closing the top. A bolt\'s end goes up into it no further than its hex (Through a line, its hex\'s axis from below); Over a shaft does not take it (its dome has no bore)',
  rows: Object.fromEntries(Object.entries(DIN1587).map(([k, r]) => [k, { d: dOf(k), ...r }])), size: 'M6', source: 'DIN 1587 as bd_warehouse gives it (copied here)',
  recipe: (q, size) => stack(`${size} cap nut`, 1, [{ b: made(`${size} cap nut hex`, 'steel-low', { hex: [mm(q.s), mm(q.m), mm(q.d) / 2] }, { color: 0xb8bcc2 }) }, { b: made(`${size} cap nut dome`, 'steel-low', { dome: [mm(q.dk) / 2] }, { color: 0xb8bcc2 }) }]),
  expect: (q) => ({ bound: [mm(corners(q.s)), mm(q.m + q.dk / 2), mm(corners(q.s))], mass: ((hexA(mm(q.s)) - disc(mm(q.d))) * mm(q.m) + (2 / 3) * Math.PI * (mm(q.dk) / 2) ** 3) * rho('steel-low'), tol: 0.01, massTol: 0.03, says: 'across corners by hex and dome; nominal mass, the hex less its bore and the half sphere' }),
  tests: [T(2)],
};
const FENDER: PartFamily<{ d1: number; d2: number; h: number }> = {
  id: 'piece.fenderwasher', name: 'Large washer', gloss: 'A large (fender) flat washer (ISO 7093) by its size', domains: FAST,
  says: 'A large flat washer (ISO 7093), about three times its bolt across, to spread a load on soft or thin stuff: it slides over a bolt\'s shank (Over a shaft)',
  rows: ISO7093, size: 'M6', source: 'ISO 7093 as src/nexus/kinds/fasteners.ts gives it',
  recipe: (q, size) => made(`${size} large washer`, 'steel-low', { tube: [mm(q.d1) / 2, mm(q.d2) / 2, mm(q.h)] }, { color: ZINC }),
  expect: (q) => ({ bound: [mm(q.d2), mm(q.h), mm(q.d2)], mass: annulus(mm(q.d2), mm(q.d1)) * mm(q.h) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its outside by its thickness; nominal mass, the ring' }),
  tests: [T(1)],
};
const SPRINGPIN: PartFamily<{ d: number; s: number }> = {
  id: 'piece.rollpin', name: 'Roll pin', gloss: 'A slotted roll pin (ISO 8752) by its diameter and length', domains: FAST,
  says: 'A slotted spring pin (ISO 8752 heavy duty; its wall about d/5, typical): a tube of spring steel, its slot and chamfers not drawn, driven into a hole a little smaller (Through a line, tight). It offers its axis',
  rows: ISO8752, size: '4', source: 'ISO 8752 heavy-duty diameters; walls typical',
  settings: [{ key: 'length', label: 'Length, mm', type: 'number', default: 20 }],
  cannot: (_q, _s, set) => above0(set, 'length', 'a length'),
  recipe: (q, size, set) => made(`${size} × ${Number(set.length)} roll pin`, 'steel-spring', { tube: [mm(q.d / 2 - q.s), mm(q.d) / 2, len(set)] }, { color: DARK }),
  expect: (q, _s, set) => ({ bound: [mm(q.d), len(set), mm(q.d)], mass: annulus(mm(q.d), mm(q.d - 2 * q.s)) * len(set) * rho('steel-spring'), tol: 0.01, massTol: 0.02, says: 'its diameter by its length; nominal mass, the tube' }),
  tests: [T(1)],
};
const RIVNUT: PartFamily<{ d: number; od: number; L: number; dh: number; k: number }> = {
  id: 'piece.rivnut', name: 'Rivet nut', gloss: 'A flat-head blind rivet nut by its thread (typical)', domains: FAST,
  says: 'A flat-head rivet nut (typical): its sleeve and its head, bored to the thread\'s size (its thread and its knurl not drawn; set, its sleeve would fold behind the sheet). It goes down a hole of its outside in thin sheet (Through a line); a bolt then goes into it',
  rows: Object.fromEntries(Object.entries(RIVNUTS).map(([k, r]) => [k, { d: dOf(k), ...r }])), size: 'M5', source: 'typical of flat-head rivet nuts',
  settings: [{ key: 'matter', label: 'Made of', type: 'choice', default: 'steel', choices: ['steel', 'aluminium', 'stainless'] }],
  recipe: (q, size, set) => { const m = matOf(set); return stack(`${size} rivet nut`, 1, [{ b: made(`${size} rivet nut sleeve`, m, { tube: [mm(q.d) / 2, mm(q.od) / 2, mm(q.L - q.k)] }, { color: ZINC }) }, { b: made(`${size} rivet nut head`, m, { tube: [mm(q.d) / 2, mm(q.dh) / 2, mm(q.k)] }, { color: ZINC }) }]); },
  expect: (q, _s, set) => ({ bound: [mm(q.dh), mm(q.L), mm(q.dh)], mass: (annulus(mm(q.od), mm(q.d)) * mm(q.L - q.k) + annulus(mm(q.dh), mm(q.d)) * mm(q.k)) * rho(matOf(set)), tol: 0.01, massTol: 0.02, says: 'its head across by its length; nominal mass, sleeve and head' }),
  tests: [T(2)],
};
const PLUG: PartFamily<{ d: number; L: number }> = {
  id: 'piece.wallplug', name: 'Wall plug', gloss: 'A nylon wall plug (anchor) by its diameter and length', domains: ['structural', 'everyday', 'mechanical'],
  says: 'A nylon wall plug: a sleeve the drill\'s size across, its bore 0.55 d (its barbs and split legs not drawn). It goes into a drilled hole (Through a line) and a screw down its bore spreads it',
  rows: PLUGS, size: '8 × 40', source: 'sizes as src/nexus/kinds/fasteners.ts gives them; bore typical',
  recipe: (q, size) => made(`${size} wall plug`, 'nylon', { tube: [mm(0.275 * q.d), mm(q.d) / 2, mm(q.L)] }, { color: 0xe8e4d8 }),
  expect: (q) => ({ bound: [mm(q.d), mm(q.L), mm(q.d)], mass: annulus(mm(q.d), mm(0.55 * q.d)) * mm(q.L) * rho('nylon'), tol: 0.01, massTol: 0.02, says: 'its diameter by its length; nominal mass, the sleeve' }),
  tests: [T(1)],
};

/** Every family of fasteners and hardware this file makes. */
export const HARDWARE = [CSK, BUTTON, PAN, WOODSCREW, SHOULDER, CARRIAGEBOLT, ROD, FLANGENUT, NYLOC, SQUARENUT, WINGNUT, CAPNUT, TNUT, RIVET, RIVNUT, SPLITPIN, CLEVISPIN, SPRINGPIN, SPRINGWASHER, FENDER, HEATSETS, STANDOFF, PLUG, MAGNET, MAGNETBLOCK, HANDLE, STARKNOB, BUMPER, FOOT, SLIDE, GASSTRUT, PIANOHINGE, TIE] as PartFamily<unknown>[];
/** Their piece nodes (registered with the maker's check.row by familyNode). */
export const HARDWARE_NODES: BlockDef[] = HARDWARE.map((f) => familyNode(f));
