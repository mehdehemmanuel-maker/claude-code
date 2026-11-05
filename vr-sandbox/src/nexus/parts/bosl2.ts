// Copied from BOSL2 (https://github.com/BelfrySCAD/BOSL2, nema_steppers.scad and ball_bearings.scad, read 2026-11-05
// as text, never run), with its licence notice kept, as decision 0026 allows for permissive files:
//
//     BSD 2-Clause License
//
//     Copyright (c) 2017-2019, Revar Desmera
//     All rights reserved.
//
//     Redistribution and use in source and binary forms, with or without modification, are permitted provided that
//     the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright notice, this list of conditions and the
//       following disclaimer.
//
//     * Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the
//       following disclaimer in the documentation and/or other materials provided with the distribution.
//
//     THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED
//     WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
//     PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY
//     DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
//     PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
//     CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
//     OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
// Changes made here: the two tables written as rows (the open, unflanged bearings only; inch sizes turned to mm),
// values mm. Written by a script (not kept in the repo) from the .scad text.

/** Where every table here is from, and what its figures are (src/nexus/evidence.ts). */
export const BOSL2_SOURCE = 'BOSL2 (Revar Desmera, BSD-2-Clause), nema_steppers.scad and ball_bearings.scad, read 2026-11-05: NEMA ICS 16 frames; bearing rows from the pages of the makers each row names';
export const BOSL2_STATUS = 'specified';
/** NEMA stepper frames (nema_motor_info): size → [body width, the face's plinth height, plinth diameter, screw hole
 *  spacing (square), screw diameter, screw hole depth, shaft diameter]. BOSL2 checked them against NEMA ICS 16 Table 4
 *  for 17 and 23 (31.0 and 47.1 mm: the bolt circle over √2; our check, docs research, 2026-11-05). */
export const NEMA_BOSL2: Record<number, [number, number, number, number, number, number, number]> = {
  6: [14,1.5,11,11.5,1.6,2.5,4],
  8: [20.3,1.5,16,15.4,2,2.5,4],
  11: [28.2,1.5,22,23.11,2.6,3,5],
  14: [35.2,2,22,26,3,4.5,5],
  17: [42.3,2,22,31,3,4.5,5],
  23: [57,1.6,38.1,47,5.1,4.8,6.35],
  34: [86,2,73,69.6,6.5,10,14],
  42: [110,1.5,55.5,88.9,8.5,12.7,19],
};
/** Deep-groove ball bearings, open and unflanged (ball_bearing_info): trade size → [bore, outside, width], and the
 *  maker's page BOSL2 names for the row (its source tags: [M] HHZC's metric table, [N…] NSK, [I] Ningbo Yuhong, [Z]
 *  ZEN, [B…] BSPD, [AST…] AST, [L…] LILY, [LNB…] LNB; their URLs in ball_bearings.scad). */
export const BEARINGS_BOSL2: Record<string, { d: number; D: number; B: number; src: string }> = {
  'R2': { d: 3.175, D: 9.525, B: 3.969, src: '[I]' },
  'R3': { d: 4.762, D: 12.7, B: 3.969, src: '[I]' },
  'R4': { d: 6.35, D: 15.875, B: 4.978, src: '[I]' },
  'R6': { d: 9.525, D: 22.225, B: 5.556, src: '[I]' },
  'R8': { d: 12.7, D: 28.575, B: 6.35, src: '[Z]' },
  'R10': { d: 15.875, D: 34.925, B: 7.144, src: '[Z]' },
  'R12': { d: 19.05, D: 41.275, B: 7.938, src: '[Z]' },
  'R14': { d: 22.225, D: 47.625, B: 9.525, src: '[Z]' },
  'R16': { d: 25.4, D: 50.8, B: 9.525, src: '[Z]' },
  'R18': { d: 28.575, D: 53.975, B: 9.525, src: '[Z]' },
  'R20': { d: 31.75, D: 57.15, B: 9.525, src: '[Z]' },
  'R22': { d: 34.925, D: 63.5, B: 11.112, src: '[Z]' },
  'R24': { d: 38.1, D: 66.675, B: 11.112, src: '[AST_R24]' },
  '608': { d: 8, D: 22, B: 7, src: '[N608]' },
  '629': { d: 9, D: 26, B: 8, src: '[N629]' },
  '635': { d: 5, D: 19, B: 6, src: '[N635]' },
  '6000': { d: 10, D: 26, B: 8, src: '[M]' },
  '6001': { d: 12, D: 28, B: 8, src: '[M]' },
  '6002': { d: 15, D: 32, B: 9, src: '[M]' },
  '6003': { d: 17, D: 35, B: 10, src: '[M]' },
  '6007': { d: 35, D: 62, B: 14, src: '[M]' },
  '6200': { d: 10, D: 30, B: 9, src: '[M]' },
  '6201': { d: 12, D: 32, B: 10, src: '[M]' },
  '6202': { d: 15, D: 35, B: 11, src: '[M]' },
  '6203': { d: 17, D: 40, B: 12, src: '[M]' },
  '6204': { d: 20, D: 47, B: 14, src: '[M]' },
  '6205': { d: 25, D: 52, B: 15, src: '[M]' },
  '6206': { d: 30, D: 62, B: 16, src: '[M]' },
  '6207': { d: 35, D: 72, B: 17, src: '[M]' },
  '6208': { d: 40, D: 80, B: 18, src: '[M]' },
  '6209': { d: 45, D: 85, B: 19, src: '[M]' },
  '6210': { d: 50, D: 90, B: 20, src: '[M]' },
  '6211': { d: 55, D: 100, B: 21, src: '[M]' },
  '6212': { d: 60, D: 110, B: 22, src: '[M]' },
  '6301': { d: 12, D: 37, B: 12, src: '[M]' },
  '6302': { d: 15, D: 42, B: 13, src: '[M]' },
  '6303': { d: 17, D: 47, B: 14, src: '[M]' },
  '6304': { d: 20, D: 52, B: 15, src: '[M]' },
  '6305': { d: 25, D: 62, B: 17, src: '[M]' },
  '6306': { d: 30, D: 72, B: 19, src: '[M]' },
  '6307': { d: 35, D: 80, B: 21, src: '[M]' },
  '6308': { d: 40, D: 90, B: 23, src: '[M]' },
  '6309': { d: 45, D: 100, B: 25, src: '[M]' },
  '6310': { d: 50, D: 110, B: 27, src: '[M]' },
  '6311': { d: 55, D: 120, B: 29, src: '[M]' },
  '6312': { d: 60, D: 130, B: 31, src: '[M]' },
  '6403': { d: 17, D: 62, B: 17, src: '[B6403], [LNB6403]' },
  '6800': { d: 10, D: 19, B: 5, src: '[M]' },
  '6801': { d: 12, D: 21, B: 5, src: '[M]' },
  '6802': { d: 15, D: 24, B: 5, src: '[M]' },
  '6803': { d: 17, D: 26, B: 5, src: '[M]' },
  '6804': { d: 20, D: 32, B: 7, src: '[M]' },
  '6805': { d: 25, D: 37, B: 7, src: '[M]' },
  '6806': { d: 30, D: 42, B: 7, src: '[M]' },
  '6900': { d: 10, D: 22, B: 6, src: '[M]' },
  '6901': { d: 12, D: 24, B: 6, src: '[M]' },
  '6902': { d: 15, D: 28, B: 7, src: '[M]' },
  '6903': { d: 17, D: 30, B: 7, src: '[M]' },
  '6904': { d: 20, D: 37, B: 9, src: '[M]' },
  '6905': { d: 25, D: 42, B: 9, src: '[M]' },
  '6906': { d: 30, D: 47, B: 9, src: '[M]' },
  '6907': { d: 35, D: 55, B: 10, src: '[M]' },
  '6908': { d: 40, D: 62, B: 12, src: '[M]' },
  '16002': { d: 15, D: 32, B: 8, src: '[M], [N16002]' },
  '16004': { d: 20, D: 42, B: 8, src: '[M]' },
  '16005': { d: 25, D: 47, B: 8, src: '[M]' },
  '16100': { d: 10, D: 28, B: 8, src: '[B16100]' },
  '16101': { d: 12, D: 30, B: 8, src: '[B16101]' },
};
