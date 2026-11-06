// Bearings and power transmission made by the table-driven maker (decision 0026, the drive trade): angular contact ball
// bearings (72xx, 73xx), thrust ball bearings (511xx, 512xx), drawn cup needle roller bearings (HK) and needle roller
// bearings without an inner ring (NK), tapered roller bearings (302xx, 303xx, 320xx X), cylindrical roller bearings (NU
// 2xx, 3xx), self-aligning ball bearings (12xx, 13xx), flanged miniature bearings (F6xx, MF), plain bushings (sleeve and
// flanged), bevel gears, worms and worm wheels, gear racks, internal gears, HTD 3M/5M and T5/T10 timing pulleys and
// their belts, roller chain sprockets (ANSI 25 to 60, ISO 06B to 12B) and the chain, V-belt pulleys (SPZ, SPA, SPB) and
// their belts, universal joints, Oldham and bellows couplings, linear shaft supports (SK, SHF), ball screws (SFU) and
// their end supports (BK, BF). Each a table of rows and one recipe of the room operations (src/nexus/room.ts): no place
// is written here, every place is what an operation gives.
//
// Where the rows come from (each family's `source` says which):
// - The rolling bearings' rows (bore, outside, width and the maker's mass): SKF's Rolling bearings catalogue (PUB BU/P1
//   17000 EN, 2018), its product tables re-keyed from the catalogue's text (dl/cat/skf17000.txt, read 2026-11-06), as
//   Misumi's catalogue page was for the 2020 extrusion (motion.ts). The bore of each comes from its designation (ISO 15's
//   bore code: 00 10 mm, 01 12, 02 15, 03 17, then five times the code). These are a maker's published figures; they are
//   facts of the parts, not copied from any licensed file. bd_warehouse's bearing CSVs (Apache-2.0) carry SKF's figures
//   too and were the cross-check for the angular contact and tapered rows (its 7200 BECBP 10 × 30 × 9, 0.03 kg; 30302 J2
//   15 × 42 × 14.25, 0.094 kg: the same).
// - Everything else is labelled typical: written from recall of makers' tables (ISO 4379 bushings, DIN 808 universal
//   joints, NMB/Minebea miniature flanged bearings, KHK's gear stock, Gates' HTD and T-belt sizes, TBI Motion's SFU nuts,
//   vendors' SK, SHF, BK and BF tables), read from no source here, or worked out by the standard's own formulas (ISO 53's
//   basic rack for racks and internal gears; ANSI B29.1's sprocket outside diameter p(0.6 + cot(180°/z)) and seating
//   curve 1.005 Dr + 0.076 mm; the pitch diameter z p / π of a timing pulley less twice its pitch line offset; ISO 4183's
//   V-groove: datum width, height above and depth below the datum, angle 34° or 38°; ISO 4184's preferred datum
//   lengths). Each family's source says which. None was cross-checked against the copyleft tables (NopSCADlib, FreeCAD):
//   left open. Threads are never drawn: a nut's bore is drawn at the screw's size.
// (Figures are mm in the tables and m in the solids.)

import { made, over, stack, through, run, type Block, type RunSeg } from '../room';
import { gear } from '../common';
import { densityKg } from '../mass';
import { familyNode, type Expect, type PartFamily } from './maker';
import type { BlockDef } from '../blocks';

const mm = (x: number): number => x / 1000;
const rho = (mat: string): number => { const d = densityKg(mat); if (d === undefined) throw new Error(`no density for ${mat}`); return d; };
const len = (set: Record<string, unknown>, k = 'length') => Number(set[k]) / 1000;
const ann = (D: number, d: number) => (Math.PI / 4) * (D * D - d * d);
const STEEL = 0xb8bcc2, BALL = 0xd8dce0, IRON = 0x2f4f7f, ALU = 0xc4c8cc, BRONZE = 0xb08d57, RUBBER = 0x1c1c1c;
const needLength = (_r: unknown, _s: string, set: Record<string, unknown>) => (len(set) > 0 ? null : `a length above 0 (${String(set.length)} mm)`);
type Q4 = [number, number, number, number];
type P2 = [number, number];

// ==== rolling bearings (SKF's product tables) ===========================================================================
/** Angular contact ball bearings, SKF 72xx and 73xx BECBP (40°): designation → bore d, outside D, width B (mm), mass (kg). */
const ANGULAR: Record<string, Q4> = {
  '7200': [10, 30, 9, 0.03], '7201': [12, 32, 10, 0.036], '7202': [15, 35, 11, 0.045], '7203': [17, 40, 12, 0.065], '7204': [20, 47, 14, 0.11], '7205': [25, 52, 15, 0.13],
  '7206': [30, 62, 16, 0.2], '7207': [35, 72, 17, 0.28], '7208': [40, 80, 18, 0.37], '7209': [45, 85, 19, 0.42], '7210': [50, 90, 20, 0.47], '7211': [55, 100, 21, 0.62],
  '7212': [60, 110, 22, 0.8], '7213': [65, 120, 23, 1], '7214': [70, 125, 24, 1.1], '7215': [75, 130, 25, 1.2], '7216': [80, 140, 26, 1.45], '7217': [85, 150, 28, 1.85],
  '7218': [90, 160, 30, 2.3], '7219': [95, 170, 32, 2.7], '7220': [100, 180, 34, 3.3], '7221': [105, 190, 36, 3.95], '7222': [110, 200, 38, 4.6], '7302': [15, 42, 13, 0.08],
  '7303': [17, 47, 14, 0.11], '7304': [20, 52, 15, 0.14], '7305': [25, 62, 17, 0.23], '7306': [30, 72, 19, 0.34], '7307': [35, 80, 21, 0.45], '7308': [40, 90, 23, 0.62],
  '7309': [45, 100, 25, 0.82], '7310': [50, 110, 27, 1.1], '7311': [55, 120, 29, 1.4], '7312': [60, 130, 31, 1.75], '7313': [65, 140, 33, 2.15], '7314': [70, 150, 35, 2.65],
  '7315': [75, 160, 37, 3.2], '7316': [80, 170, 39, 3.8], '7317': [85, 180, 41, 4.45], '7318': [90, 190, 43, 5.2], '7319': [95, 200, 45, 6.05], '7320': [100, 215, 47, 7.5],
  '7321': [105, 225, 49, 8.55], '7322': [110, 240, 50, 10],
};
/** Thrust ball bearings, single direction, SKF 511xx and 512xx: designation → bore d, outside D, height H (mm), mass (kg). */
const THRUST: Record<string, Q4> = {
  '51100': [10, 24, 9, 0.02], '51200': [10, 26, 11, 0.03], '51101': [12, 26, 9, 0.022], '51201': [12, 28, 11, 0.034], '51102': [15, 28, 9, 0.023], '51202': [15, 32, 12, 0.046],
  '51103': [17, 30, 9, 0.025], '51203': [17, 35, 12, 0.053], '51104': [20, 35, 10, 0.037], '51204': [20, 40, 14, 0.083], '51105': [25, 42, 11, 0.056], '51205': [25, 47, 15, 0.11],
  '51106': [30, 47, 11, 0.063], '51206': [30, 52, 16, 0.13], '51107': [35, 52, 12, 0.08], '51207': [35, 62, 18, 0.22], '51108': [40, 60, 13, 0.12], '51208': [40, 68, 19, 0.28],
  '51109': [45, 65, 14, 0.14], '51209': [45, 73, 20, 0.3], '51110': [50, 70, 14, 0.16], '51210': [50, 78, 22, 0.37], '51111': [55, 78, 16, 0.23], '51211': [55, 90, 25, 0.59],
  '51112': [60, 85, 17, 0.27], '51212': [60, 95, 26, 0.65], '51113': [65, 90, 18, 0.33], '51213': [65, 100, 27, 0.72], '51114': [70, 95, 18, 0.35], '51214': [70, 105, 27, 0.79],
  '51115': [75, 100, 19, 0.4], '51215': [75, 110, 27, 0.83], '51116': [80, 105, 19, 0.42], '51216': [80, 115, 28, 0.91], '51117': [85, 110, 19, 0.44], '51217': [85, 125, 31, 1.2],
  '51118': [90, 120, 22, 0.67], '51218': [90, 135, 35, 1.7], '51120': [100, 135, 25, 0.97], '51220': [100, 150, 38, 2.2], '51122': [110, 145, 25, 1.05], '51222': [110, 160, 38, 2.4],
  '51124': [120, 155, 25, 1.15], '51224': [120, 170, 39, 2.65], '51126': [130, 170, 30, 1.85], '51226': [130, 190, 45, 4], '51128': [140, 180, 31, 2.05], '51228': [140, 200, 46, 4.35],
};
/** Drawn cup needle roller bearings, open ends, SKF HK: designation → shaft Fw, outside D, width C (mm), mass (kg, SKF's g / 1000). */
const HK: Record<string, Q4> = {
  'HK 0306 TN': [3, 6.5, 6, 0.001], 'HK 0408': [4, 8, 8, 0.002], 'HK 0509': [5, 9, 9, 0.002], 'HK 0608': [6, 10, 8, 0.0021], 'HK 0609': [6, 10, 9, 0.0025], 'HK 0709': [7, 11, 9, 0.0026],
  'HK 0808': [8, 12, 8, 0.0027], 'HK 0810': [8, 12, 10, 0.003], 'HK 0908': [9, 13, 8, 0.003], 'HK 0910': [9, 13, 10, 0.004], 'HK 0912': [9, 13, 12, 0.0046], 'HK 1010': [10, 14, 10, 0.0041],
  'HK 1012': [10, 14, 12, 0.0048], 'HK 1015': [10, 14, 15, 0.006], 'HK 1210': [12, 16, 10, 0.0046], 'HK 1212': [12, 18, 12, 0.0095], 'HK 1312': [13, 19, 12, 0.0105], 'HK 1412': [14, 20, 12, 0.0105],
  'HK 1512': [15, 21, 12, 0.011], 'HK 1516': [15, 21, 16, 0.015], 'HK 1612': [16, 22, 12, 0.012], 'HK 1616': [16, 22, 16, 0.016], 'HK 1712': [17, 23, 12, 0.013], 'HK 1812': [18, 24, 12, 0.013],
  'HK 1816': [18, 24, 16, 0.018], 'HK 2010': [20, 26, 10, 0.012], 'HK 2012': [20, 26, 12, 0.014], 'HK 2020': [20, 26, 20, 0.024], 'HK 2210': [22, 28, 10, 0.013], 'HK 2212': [22, 28, 12, 0.015],
  'HK 2216': [22, 28, 16, 0.021], 'HK 2220': [22, 28, 20, 0.026], 'HK 2512': [25, 32, 12, 0.02], 'HK 2516': [25, 32, 16, 0.025], 'HK 2520': [25, 32, 20, 0.033], 'HK 2526': [25, 32, 26, 0.044],
  'HK 2816': [28, 35, 16, 0.0265], 'HK 2820': [28, 35, 20, 0.036], 'HK 3012': [30, 37, 12, 0.023], 'HK 3016': [30, 37, 16, 0.031], 'HK 3020': [30, 37, 20, 0.038], 'HK 3026': [30, 37, 26, 0.051],
  'HK 3512': [35, 42, 12, 0.027], 'HK 3516': [35, 42, 16, 0.036], 'HK 3520': [35, 42, 20, 0.044], 'HK 4012': [40, 47, 12, 0.03], 'HK 4016': [40, 47, 16, 0.039], 'HK 4020': [40, 47, 20, 0.054],
  'HK 4512': [45, 52, 12, 0.033], 'HK 4516': [45, 52, 16, 0.047], 'HK 4520': [45, 52, 20, 0.056], 'HK 5020': [50, 58, 20, 0.07], 'HK 5025': [50, 58, 25, 0.085], 'HK 5520': [55, 63, 20, 0.074],
  'HK 5528': [55, 63, 28, 0.105], 'HK 6012': [60, 68, 12, 0.049], 'HK 6020': [60, 68, 20, 0.081], 'HK 6032': [60, 68, 32, 0.136],
};
/** Needle roller bearings with machined rings, no inner ring, SKF NK: designation → shaft Fw, outside D, width C (mm), mass (kg). */
const NK: Record<string, Q4> = {
  'NK 5/10 TN': [5, 10, 10, 0.0031], 'NK 5/12 TN': [5, 10, 12, 0.0037], 'NK 6/10 TN': [6, 12, 10, 0.0047], 'NK 6/12 TN': [6, 12, 12, 0.0057], 'NK 7/10 TN': [7, 14, 10, 0.0069], 'NK 7/12 TN': [7, 14, 12, 0.0082],
  'NK 8/12 TN': [8, 15, 12, 0.0087], 'NK 8/16 TN': [8, 15, 16, 0.012], 'NK 9/12 TN': [9, 16, 12, 0.01], 'NK 9/16 TN': [9, 16, 16, 0.013], 'NK 10/12 TN': [10, 17, 12, 0.01], 'NK 10/16 TN': [10, 17, 16, 0.013],
  'NK 12/12': [12, 19, 12, 0.012], 'NK 12/16': [12, 19, 16, 0.016], 'NK 14/16': [14, 22, 16, 0.021], 'NK 14/20': [14, 22, 20, 0.026], 'NK 15/16': [15, 23, 16, 0.022], 'NK 15/20': [15, 23, 20, 0.027],
  'NK 16/16': [16, 24, 16, 0.022], 'NK 16/20': [16, 24, 20, 0.028], 'NK 17/16': [17, 25, 16, 0.024], 'NK 17/20': [17, 25, 20, 0.03], 'NK 18/16': [18, 26, 16, 0.025], 'NK 18/20': [18, 26, 20, 0.031],
  'NK 19/16': [19, 27, 16, 0.026], 'NK 19/20': [19, 27, 20, 0.032], 'NK 20/16': [20, 28, 16, 0.027], 'NK 20/20': [20, 28, 20, 0.034], 'NK 22/16': [22, 30, 16, 0.03], 'NK 22/20': [22, 30, 20, 0.037],
  'NK 24/16': [24, 32, 16, 0.032], 'NK 24/20': [24, 32, 20, 0.04], 'NK 25/16': [25, 33, 16, 0.033], 'NK 25/20': [25, 33, 20, 0.042], 'NK 26/16': [26, 34, 16, 0.034], 'NK 26/20': [26, 34, 20, 0.042],
  'NK 28/20': [28, 37, 20, 0.052], 'NK 28/30': [28, 37, 30, 0.082], 'NK 29/20 TN': [29, 38, 20, 0.05], 'NK 29/30': [29, 38, 30, 0.084], 'NK 30/20 TN': [30, 40, 20, 0.061], 'NK 30/30 TN': [30, 40, 30, 0.092],
  'NK 35/20 TN': [35, 45, 20, 0.069], 'NK 35/30 TN': [35, 45, 30, 0.11], 'NK 37/20': [37, 47, 20, 0.077], 'NK 37/30': [37, 47, 30, 0.11], 'NK 38/20': [38, 48, 20, 0.079], 'NK 38/30': [38, 48, 30, 0.12],
  'NK 40/20 TN': [40, 50, 20, 0.078], 'NK 40/30': [40, 50, 30, 0.13], 'NK 42/20': [42, 52, 20, 0.086], 'NK 42/30': [42, 52, 30, 0.13], 'NK 43/20': [43, 53, 20, 0.086], 'NK 43/30': [43, 53, 30, 0.13],
  'NK 45/20 TN': [45, 55, 20, 0.085], 'NK 45/30 TN': [45, 55, 30, 0.13], 'NK 47/20': [47, 57, 20, 0.095], 'NK 47/30': [47, 57, 30, 0.14], 'NK 50/25 TN': [50, 62, 25, 0.15], 'NK 50/35 TN': [50, 62, 35, 0.21],
  'NK 55/25': [55, 68, 25, 0.18], 'NK 55/35': [55, 68, 35, 0.25],
};
/** Tapered roller bearings, single row, SKF 302xx, 303xx and 320xx X: designation → bore d, outside D, overall width T (mm), mass (kg). */
const TAPER: Record<string, Q4> = {
  '30202': [15, 35, 11.75, 0.055], '30203': [17, 40, 13.25, 0.079], '30204': [20, 47, 15.25, 0.12], '30205': [25, 52, 16.25, 0.15], '302/28': [28, 58, 17.25, 0.2], '30206': [30, 62, 17.25, 0.23],
  '30207': [35, 72, 18.25, 0.33], '30208': [40, 80, 19.75, 0.42], '30209': [45, 85, 20.75, 0.47], '30210': [50, 90, 21.75, 0.54], '30211': [55, 100, 22.75, 0.7], '30212': [60, 110, 23.75, 0.88],
  '30213': [65, 120, 24.75, 1.1], '30214': [70, 125, 26.25, 1.25], '30215': [75, 130, 27.25, 1.4], '30216': [80, 140, 28.25, 1.6], '30217': [85, 150, 30.5, 2.05], '30218': [90, 160, 32.5, 2.5],
  '30219': [95, 170, 34.5, 3], '30220': [100, 180, 37, 3.65], '30221': [105, 190, 39, 4.3], '30222': [110, 200, 41, 5.05], '30224': [120, 215, 43.5, 6.15], '30226': [130, 230, 43.75, 6.85],
  '30228': [140, 250, 45.75, 8.7], '30230': [150, 270, 49, 10.5], '30302': [15, 42, 14.25, 0.094], '30303': [17, 47, 15.25, 0.13], '30304': [20, 52, 16.25, 0.17], '30305': [25, 62, 18.25, 0.26],
  '30306': [30, 72, 20.75, 0.38], '30307': [35, 80, 22.75, 0.51], '30308': [40, 90, 25.25, 0.73], '30309': [45, 100, 27.25, 0.97], '30310': [50, 110, 29.25, 1.25], '30311': [55, 120, 31.5, 1.55],
  '30312': [60, 130, 33.5, 1.95], '30313': [65, 140, 36, 2.4], '30314': [70, 150, 38, 2.95], '30315': [75, 160, 40, 3.5], '30316': [80, 170, 42.5, 4.15], '30317': [85, 180, 44.5, 4.85],
  '30318': [90, 190, 46.5, 5.65], '30319': [95, 200, 49.5, 6.45], '30320': [100, 215, 51.5, 7.95], '30321': [105, 225, 53.5, 9.1], '30322': [110, 240, 54.5, 11], '30324': [120, 260, 59.5, 13.5],
  '30326': [130, 280, 63.75, 17], '30328': [140, 300, 67.75, 20.5], '30330': [150, 320, 72, 25], '32004 X': [20, 42, 15, 0.099], '320/22 X': [22, 44, 15, 0.1], '32005 X': [25, 47, 15, 0.11],
  '320/28 X': [28, 52, 16, 0.14], '32006 X': [30, 55, 17, 0.17], '320/32 X': [32, 58, 17, 0.19], '32007 X': [35, 62, 18, 0.23], '32008 X': [40, 68, 19, 0.28], '32009 X': [45, 75, 20, 0.34],
  '32010 X': [50, 80, 20, 0.38], '32011 X': [55, 90, 23, 0.56], '32012 X': [60, 95, 23, 0.59], '32013 X': [65, 100, 23, 0.63], '32014 X': [70, 110, 25, 0.85], '32015 X': [75, 115, 25, 0.91],
  '32016 X': [80, 125, 29, 1.3], '32017 X': [85, 130, 29, 1.35], '32018 X': [90, 140, 32, 1.75], '32019 X': [95, 145, 32, 1.85], '32020 X': [100, 150, 32, 1.9], '32021 X': [105, 160, 35, 2.45],
  '32022 X': [110, 170, 38, 3.05], '32024 X': [120, 180, 38, 3.3], '32026 X': [130, 200, 45, 4.95], '32028 X': [140, 210, 45, 5.25], '32030 X': [150, 225, 48, 6.4],
};
/** Cylindrical roller bearings, NU design, SKF NU 2xx and 3xx ECP: designation → bore d, outside D, width B (mm), mass (kg). */
const NU: Record<string, Q4> = {
  'NU 202 ECP': [15, 35, 11, 0.047], 'NU 203 ECP': [17, 40, 12, 0.068], 'NU 204 ECP': [20, 47, 14, 0.11], 'NU 205 ECP': [25, 52, 15, 0.13], 'NU 206 ECP': [30, 62, 16, 0.2], 'NU 207 ECP': [35, 72, 17, 0.29],
  'NU 208 ECP': [40, 80, 18, 0.37], 'NU 209 ECP': [45, 85, 19, 0.42], 'NU 210 ECP': [50, 90, 20, 0.47], 'NU 211 ECP': [55, 100, 21, 0.66], 'NU 212 ECP': [60, 110, 22, 0.8], 'NU 213 ECP': [65, 120, 23, 1],
  'NU 214 ECP': [70, 125, 24, 1.15], 'NU 215 ECP': [75, 130, 25, 1.25], 'NU 216 ECP': [80, 140, 26, 1.55], 'NU 217 ECP': [85, 150, 28, 1.9], 'NU 218 ECP': [90, 160, 30, 2.3], 'NU 219 ECP': [95, 170, 32, 2.85],
  'NU 220 ECP': [100, 180, 34, 3.35], 'NU 221 ECP': [105, 190, 36, 3.95], 'NU 222 ECP': [110, 200, 38, 4.7], 'NU 224 ECP': [120, 215, 40, 5.75], 'NU 226 ECP': [130, 230, 40, 6.45], 'NU 303 ECP': [17, 47, 14, 0.12],
  'NU 304 ECP': [20, 52, 15, 0.14], 'NU 305 ECP': [25, 62, 17, 0.23], 'NU 306 ECP': [30, 72, 19, 0.36], 'NU 307 ECP': [35, 80, 21, 0.47], 'NU 308 ECP': [40, 90, 23, 0.65], 'NU 309 ECP': [45, 100, 25, 0.9],
  'NU 310 ECP': [50, 110, 27, 1.1], 'NU 311 ECP': [55, 120, 29, 1.45], 'NU 312 ECP': [60, 130, 31, 1.75], 'NU 313 ECP': [65, 140, 33, 2.2], 'NU 314 ECP': [70, 150, 35, 2.7], 'NU 315 ECP': [75, 160, 37, 3.3],
  'NU 316 ECP': [80, 170, 39, 3.85], 'NU 317 ECP': [85, 180, 41, 4.65], 'NU 318 ECP': [90, 190, 43, 5.25], 'NU 319 ECP': [95, 200, 45, 6.2], 'NU 320 ECP': [100, 215, 47, 7.45], 'NU 321 ECP': [105, 225, 49, 8.5],
  'NU 322 ECP': [110, 240, 50, 10.5], 'NU 324 ECP': [120, 260, 55, 13], 'NU 326 ECP': [130, 280, 58, 16],
};
/** Self-aligning ball bearings, SKF 12xx and 13xx (ETN9 where so made): designation → bore d, outside D, width B (mm), mass (kg). */
const SELFALIGN: Record<string, Q4> = {
  '1200 ETN9': [10, 30, 9, 0.034], '1201 ETN9': [12, 32, 10, 0.04], '1202 ETN9': [15, 35, 11, 0.049], '1203 ETN9': [17, 40, 12, 0.073], '1204 ETN9': [20, 47, 14, 0.12], '1205 ETN9': [25, 52, 15, 0.14],
  '1206 ETN9': [30, 62, 16, 0.22], '1207 ETN9': [35, 72, 17, 0.32], '1208 ETN9': [40, 80, 18, 0.42], '1209 ETN9': [45, 85, 19, 0.47], '1210 ETN9': [50, 90, 20, 0.53], '1211 ETN9': [55, 100, 21, 0.71],
  '1212 ETN9': [60, 110, 22, 0.9], '1213 ETN9': [65, 120, 23, 1.15], '1214 ETN9': [70, 125, 24, 1.25], '1215': [75, 130, 25, 1.35], '1216': [80, 140, 26, 1.65], '1217': [85, 150, 28, 2.05],
  '1218': [90, 160, 30, 2.5], '1219': [95, 170, 32, 3.1], '1220': [100, 180, 34, 3.7], '1222': [110, 200, 38, 5.15], '1301 ETN9': [12, 37, 12, 0.067], '1302 ETN9': [15, 42, 13, 0.094],
  '1303 ETN9': [17, 47, 14, 0.12], '1304 ETN9': [20, 52, 15, 0.16], '1305 ETN9': [25, 62, 17, 0.26], '1306 ETN9': [30, 72, 19, 0.39], '1307 ETN9': [35, 80, 21, 0.51], '1308 ETN9': [40, 90, 23, 0.68],
  '1309 ETN9': [45, 100, 25, 0.96], '1310 ETN9': [50, 110, 27, 1.2], '1311 ETN9': [55, 120, 29, 1.6], '1312 ETN9': [60, 130, 31, 1.95], '1313 ETN9': [65, 140, 33, 2.45], '1314': [70, 150, 35, 3],
  '1315': [75, 160, 37, 3.55], '1316': [80, 170, 39, 4.2], '1317': [85, 180, 41, 5], '1318': [90, 190, 43, 5.8], '1319': [95, 200, 45, 6.7], '1320': [100, 215, 47, 8.3],
};
/** A rolling bearing as its rings and the row of its rolling elements between them: the inner ring's bore d, the outer
 *  ring's outside D, both its width; the row a ring on the pitch circle (d + D) / 4, as wide across as the elements (a
 *  share of the rings' section, typical) and as long as they are; the outer ring slid over all. Approximated so: the
 *  elements drawn as one ring of their row (no balls or rollers apart, no cage, no raceway grooves). */
function rolling(name: string, d: number, D: number, B: number, share: number, rowLen: number, elems: string, outerLen = B, at: 'mid' | 'lo' = 'mid'): Block {
  const R = (d + D) / 4, w = (share * (D - d)) / 2, ri = R - w / 2, ro = R + w / 2;
  const inner = made(`${name} inner ring`, 'steel-chrome', { tube: [mm(d) / 2, mm(ri), mm(B)] }, { color: STEEL });
  const row = made(`${name} ${elems}`, 'steel-chrome', { tube: [mm(ri), mm(ro), mm(rowLen)] }, { color: BALL });
  return over(over(inner, `${name} inner ring/axis`, row, 'mid', 'touch'), `${name} inner ring/axis`, made(`${name} outer ring`, 'steel-chrome', { tube: [mm(ro), mm(D) / 2, mm(outerLen)] }, { color: STEEL }), at, 'touch');
}
const bearingExpect = (D: number, B: number, kg: number, said: string): Expect => ({ bound: [mm(D), mm(B), mm(D)], mass: kg, tol: 0.01, massTol: 0.2, says: `its outside and width; SKF's mass (${said})` });
const sizeTest = (offers: string[], pieces: number) => [{ inputs: {}, outputs: { pieces, offers } }];
const SKF = 'SKF Rolling bearings catalogue (PUB BU/P1 17000 EN, 2018), its product tables re-keyed; bores by ISO 15\'s bore code';
const AISLE_B = (c: string) => `Bearings / ${c}`;

const ANGULAR_F: PartFamily<Q4> = {
  id: 'piece.angularbearing', name: 'Angular contact ball bearing', gloss: 'A single row angular contact ball bearing (72xx, 73xx BECBP, 40°) by its designation', domains: ['mechanical', 'manufacturing', 'vehicles'], aisle: AISLE_B('Angular contact'),
  says: 'A single row angular contact ball bearing (SKF 72xx and 73xx BECBP, 40° contact; bores 10 to 120 mm): its inner ring, the row of its balls (each about 0.6 of the rings\' section, typical) as one ring between, its outer ring over all. Approximated: the balls drawn as one ring, no cage, no raceways, its contact angle not drawn. Mounted in pairs (back to back, face to face). It offers <size> inner ring/axis (a shaft through it: Through a line) and <size> outer ring/axis (into a housing)',
  rows: ANGULAR, size: '7204', source: SKF,
  recipe: ([d, D, B], size) => rolling(size, d, D, B, 0.6, 0.6 * (D - d) / 2, 'balls'),
  cannot: ([d, D]) => (D > d ? null : 'its outside within its bore'),
  expect: ([, D, B, kg]) => bearingExpect(D, B, kg, 'rings and the ball row drawn solid'),
  tests: sizeTest(['7204 balls/axis', '7204 inner ring/axis', '7204 outer ring/axis'], 3),
};
const THRUST_F: PartFamily<Q4> = {
  id: 'piece.thrustbearing', name: 'Thrust ball bearing', gloss: 'A single direction thrust ball bearing (511xx, 512xx) by its designation: two washers and the balls between', domains: ['mechanical', 'manufacturing', 'vehicles'], aisle: AISLE_B('Thrust'),
  says: 'A single direction thrust ball bearing (SKF 511xx and 512xx, bores 10 to 150 mm, its height H): its shaft washer (bore d), its ball row (balls about half its height, typical) and its housing washer (outside D) stacked along its axis. Approximated: the balls drawn as one ring, no cage or raceways, both washers d to D (the housing washer\'s bore a little larger in the part). It takes an axial load only; a shaft goes through it (Through a line)',
  rows: THRUST, size: '51104', source: SKF,
  cannot: ([d, D]) => (D > d ? null : 'its outside within its bore'),
  recipe: ([d, D, H], size) => { const Dw = Math.min(0.5 * H, 0.6 * (D - d) / 2), t = (H - Dw) / 2, R = (d + D) / 4;
    const washer = (k: string) => made(`${size} ${k} washer`, 'steel-chrome', { tube: [mm(d) / 2, mm(D) / 2, mm(t)] }, { color: STEEL });
    return stack(`${size} thrust bearing`, 1, [{ b: washer('shaft') }, { b: made(`${size} balls`, 'steel-chrome', { tube: [mm(R - Dw / 2), mm(R + Dw / 2), mm(Dw)] }, { color: BALL }) }, { b: washer('housing') }]); },
  expect: ([, D, H, kg]) => bearingExpect(D, H, kg, 'washers and the ball row drawn solid'),
  tests: sizeTest(['51104 balls/axis', '51104 housing washer/axis', '51104 shaft washer/axis'], 3),
};
const HK_F: PartFamily<Q4> = {
  id: 'piece.drawncup', name: 'Drawn cup needle roller bearing (HK)', gloss: 'A drawn cup needle roller bearing with open ends (HK) by its designation: its shell and its needles, no inner ring', domains: ['mechanical', 'manufacturing', 'vehicles'], aisle: AISLE_B('Needle roller'),
  says: 'A drawn cup needle roller bearing, open ends (SKF HK, shaft 3 to 60 mm): its thin drawn steel shell (about a third of its section, typical) pressed into a housing, and its needles in their cage running straight on the shaft (no inner ring: the shaft hardened is its raceway). Approximated: the needles drawn as one ring a shell\'s thickness shorter than the cup at each end, its lips not drawn. Its row offers <size> needles/axis: it goes over a shaft of its size (Over a shaft); its shell into a bore',
  rows: HK, size: 'HK 1010', source: `${SKF}; the masses SKF's (g, here kg)`,
  cannot: ([d, D]) => (D > d ? null : 'its outside within its bore'),
  recipe: ([Fw, D, C], size) => { const t = 0.3 * (D - Fw) / 2;
    return over(made(`${size} needles`, 'steel-chrome', { tube: [mm(Fw) / 2, mm(D / 2 - t), mm(C - 2 * t)] }, { color: BALL }), `${size} needles/axis`, made(`${size} shell`, 'steel-low', { tube: [mm(D / 2 - t), mm(D) / 2, mm(C)] }, { color: STEEL }), 'mid', 'touch'); },
  expect: ([, D, C, kg]) => bearingExpect(D, C, kg, 'shell and needle row drawn solid'),
  tests: sizeTest(['HK 1010 needles/axis', 'HK 1010 shell/axis'], 2),
};
const NK_F: PartFamily<Q4> = {
  id: 'piece.needlebearing', name: 'Needle roller bearing (NK)', gloss: 'A needle roller bearing with machined rings, no inner ring (NK), by its designation', domains: ['mechanical', 'manufacturing', 'vehicles'], aisle: AISLE_B('Needle roller'),
  says: 'A needle roller bearing with a machined outer ring and no inner ring (SKF NK Fw/C, shaft 5 to 55 mm): its outer ring (about 0.4 of its section, typical) and its needles in their cage running on the shaft. Approximated: the needles drawn as one ring 0.8 of its width, its flanges not drawn. It offers <size> needles/axis (over a shaft of its Fw) and <size> ring/axis',
  rows: NK, size: 'NK 20/20', source: SKF,
  cannot: ([d, D]) => (D > d ? null : 'its outside within its bore'),
  recipe: ([Fw, D, C], size) => { const t = 0.4 * (D - Fw) / 2;
    return over(made(`${size} needles`, 'steel-chrome', { tube: [mm(Fw) / 2, mm(D / 2 - t), mm(0.8 * C)] }, { color: BALL }), `${size} needles/axis`, made(`${size} ring`, 'steel-chrome', { tube: [mm(D / 2 - t), mm(D) / 2, mm(C)] }, { color: STEEL }), 'mid', 'touch'); },
  expect: ([, D, C, kg]) => bearingExpect(D, C, kg, 'ring and needle row drawn solid'),
  tests: sizeTest(['NK 20/20 needles/axis', 'NK 20/20 ring/axis'], 2),
};
const TAPER_F: PartFamily<Q4> = {
  id: 'piece.taperbearing', name: 'Tapered roller bearing', gloss: 'A single row tapered roller bearing (302xx, 303xx, 320xx X) by its designation: cone, rollers and cup', domains: ['mechanical', 'manufacturing', 'vehicles'], aisle: AISLE_B('Tapered roller'),
  says: 'A single row tapered roller bearing (SKF 302xx, 303xx and 320xx X, metric, bores 15 to 150 mm; T its overall width): its cone (inner ring) drawn T wide, its rollers (about 0.4 of the section across, 0.7 T long, typical) as one ring, its cup (0.79 T wide, 30204\'s share, typical) slid on flush with the cone\'s back. Approximated: the rollers one ring, not tapered; the cone\'s width B and the cup\'s C, a page further in the table, not read. Mounted in pairs; a shaft through its cone (Through a line), its cup into a housing',
  rows: TAPER, size: '30204', source: SKF,
  cannot: ([d, D]) => (D > d ? null : 'its outside within its bore'),
  recipe: ([d, D, T], size) => rolling(size, d, D, T, 0.4, 0.7 * T, 'rollers', 0.79 * T, 'lo'),
  expect: ([, D, T, kg]) => bearingExpect(D, T, kg, 'cone, cup and roller row drawn solid'),
  tests: sizeTest(['30204 inner ring/axis', '30204 outer ring/axis', '30204 rollers/axis'], 3),
};
const NU_F: PartFamily<Q4> = {
  id: 'piece.cylbearing', name: 'Cylindrical roller bearing', gloss: 'A single row cylindrical roller bearing (NU 2xx, 3xx ECP) by its designation', domains: ['mechanical', 'manufacturing', 'vehicles'], aisle: AISLE_B('Cylindrical roller'),
  says: 'A single row cylindrical roller bearing, NU design (SKF NU 2xx and 3xx ECP, bores 15 to 150 mm): its inner ring, its rollers (about 0.55 of the section across and 0.6 of its width long, typical) as one ring, its outer ring with its two ribs over all. Approximated: the rollers one ring, no cage, the ribs not drawn. It carries a radial load and lets the shaft slide; a shaft through its inner ring (Through a line)',
  rows: NU, size: 'NU 204 ECP', source: SKF,
  cannot: ([d, D]) => (D > d ? null : 'its outside within its bore'),
  recipe: ([d, D, B], size) => rolling(size, d, D, B, 0.55, 0.6 * B, 'rollers'),
  expect: ([, D, B, kg]) => bearingExpect(D, B, kg, 'rings and roller row drawn solid'),
  tests: sizeTest(['NU 204 ECP inner ring/axis', 'NU 204 ECP outer ring/axis', 'NU 204 ECP rollers/axis'], 3),
};
const SELFALIGN_F: PartFamily<Q4> = {
  id: 'piece.selfaligning', name: 'Self-aligning ball bearing', gloss: 'A self-aligning ball bearing (12xx, 13xx) by its designation: two rows of balls in a sphered outer ring', domains: ['mechanical', 'manufacturing'], aisle: AISLE_B('Self-aligning'),
  says: 'A self-aligning ball bearing (SKF 12xx and 13xx, bores 10 to 110 mm): its inner ring, its two rows of balls (each about 0.5 of the section, typical) as one ring 0.75 of its width, its outer ring (its sphered raceway not drawn) over all. Approximated: the balls one ring. It takes a shaft out of line by a few degrees; a shaft through its inner ring (Through a line)',
  rows: SELFALIGN, size: '1204 ETN9', source: SKF,
  cannot: ([d, D]) => (D > d ? null : 'its outside within its bore'),
  recipe: ([d, D, B], size) => rolling(size, d, D, B, 0.5, 0.75 * B, 'balls'),
  expect: ([, D, B, kg]) => bearingExpect(D, B, kg, 'rings and ball rows drawn solid'),
  tests: sizeTest(['1204 ETN9 balls/axis', '1204 ETN9 inner ring/axis', '1204 ETN9 outer ring/axis'], 3),
};
/** Flanged miniature ball bearings (NMB/Minebea and makers' MF and F6xx tables, recalled, read from no source here:
 *  typical): bore d, outside D, width B, flange diameter Df and thickness Bf, mm. */
const FLANGED: Record<string, [number, number, number, number, number]> = {
  MF52: [2, 5, 2.5, 6.2, 0.6], MF63: [3, 6, 2.5, 7.2, 0.6], MF74: [4, 7, 2.5, 8.2, 0.6], MF84: [4, 8, 3, 9.2, 0.6], MF85: [5, 8, 2.5, 9.2, 0.6], MF95: [5, 9, 3, 10.2, 0.6], MF105: [5, 10, 4, 11.2, 0.6], MF106: [6, 10, 3, 11.2, 0.6],
  MF117: [7, 11, 3, 12.2, 0.6], MF128: [8, 12, 3.5, 13.6, 0.6], MF148: [8, 14, 4, 15.6, 0.8], F682: [2, 5, 2.3, 6.1, 0.5], F683: [3, 7, 3, 8.1, 0.5], F684: [4, 9, 4, 10.3, 0.6], F685: [5, 11, 5, 12.5, 0.8], F686: [6, 13, 5, 15, 1],
  F688: [8, 16, 5, 18, 1], F693: [3, 8, 4, 9.5, 0.7], F694: [4, 11, 4, 12.5, 1], F695: [5, 13, 4, 15, 1], F696: [6, 15, 5, 17, 1.2], F697: [7, 17, 5, 19, 1.2], F698: [8, 19, 6, 22, 1.5], F623: [3, 10, 4, 11.5, 1],
  F624: [4, 13, 5, 15, 1], F625: [5, 16, 5, 18, 1], F626: [6, 19, 6, 22, 1.5], F608: [8, 22, 7, 25, 1.5],
};
const FLANGED_F: PartFamily<(typeof FLANGED)[string]> = {
  id: 'piece.flangedmini', name: 'Flanged miniature ball bearing', gloss: 'A flanged miniature deep-groove ball bearing (MF, F6xx) by its designation: its flange stops it in a bore', domains: ['mechanical', 'manufacturing', 'everyday'], aisle: AISLE_B('Miniature'),
  says: 'A flanged miniature ball bearing (MF52 to MF148, F682 to F608; makers\' tables, typical): its inner ring, its ball row (0.6 of the section, typical) as one ring, its outer ring turned with its flange at one face (Df × Bf), so it stops against a housing\'s face when pressed into a bore of its outside. Approximated: the balls one ring, no shields. 3D printers\' idlers and belt pulleys run on them. It offers <size> inner ring/axis (a shaft or a bolt through it)',
  rows: FLANGED, size: 'F623', source: 'makers\' tables of flanged miniature bearings (NMB/Minebea MF and F6xx, recalled, read from no source here: typical)',
  cannot: ([d, D, , Df]) => (D > d && Df > D ? null : 'its outside within its bore, its flange beyond its outside'),
  recipe: ([d, D, B, Df, Bf], size) => { const R = (d + D) / 4, w = 0.3 * (D - d), ri = R - w / 2, ro = R + w / 2;
    const inner = made(`${size} inner ring`, 'steel-chrome', { tube: [mm(d) / 2, mm(ri), mm(B)] }, { color: STEEL });
    const balls = made(`${size} balls`, 'steel-chrome', { tube: [mm(ri), mm(ro), mm(Math.min(w, B))] }, { color: BALL });
    const outer = made(`${size} outer ring`, 'steel-chrome', { lathe: { pts: ([[ro, 0], [Df / 2, 0], [Df / 2, Bf], [D / 2, Bf], [D / 2, B], [ro, B]] as P2[]).map(([a, b]) => [mm(a), mm(b)] as P2), bore: mm(ro) } }, { color: STEEL });
    return over(over(inner, `${size} inner ring/axis`, balls, 'mid', 'touch'), `${size} inner ring/axis`, outer, 'mid', 'touch'); },
  expect: ([d, D, B, Df, Bf]) => ({ bound: [mm(Df), mm(B), mm(Df)], tol: 0.01, says: `its flange across by its width (bore ${d}, outside ${D}, flange ${Bf} thick)` }),
  tests: sizeTest(['F623 balls/axis', 'F623 inner ring/axis', 'F623 outer ring/axis'], 3),
};
// ==== plain bushings ================================================================================================
/** Plain bushings of sintered or cast bronze (ISO 4379, makers' tables of it, recalled, read from no source here:
 *  typical): bore d1, outside d2 (its middle series), flanged ones' flange d3 and thickness b2, mm. */
const BUSH: Record<string, [number, number, number, number]> = {
  '3': [3, 6, 9, 1.5], '4': [4, 8, 12, 2], '5': [5, 9, 13, 2], '6': [6, 10, 14, 3], '8': [8, 12, 16, 3], '10': [10, 14, 18, 3], '12': [12, 16, 20, 3], '14': [14, 18, 22, 3], '15': [15, 19, 23, 3], '16': [16, 20, 24, 3],
  '18': [18, 22, 26, 3], '20': [20, 24, 28, 3], '22': [22, 26, 30, 3], '25': [25, 30, 35, 4], '28': [28, 34, 40, 4], '30': [30, 36, 42, 4], '32': [32, 38, 44, 4], '35': [35, 41, 47, 5], '40': [40, 46, 54, 5], '45': [45, 52, 60, 5], '50': [50, 57, 65, 5],
};
const BUSH_SRC = 'ISO 4379 (form C sleeve, form F flanged) as makers\' tables give it, recalled, read from no source here: typical';
const SLEEVE_F: PartFamily<(typeof BUSH)[string]> = {
  id: 'piece.bushing', name: 'Plain bushing (sleeve)', gloss: 'A plain bronze sleeve bushing (ISO 4379 form C) by its bore and length', domains: ['mechanical', 'manufacturing', 'everyday'], aisle: 'Bearings / Plain bushings',
  says: 'A plain sleeve bushing of oil-impregnated sintered bronze (ISO 4379 form C, bores 3 to 50 mm): a tube d1 × d2 so long, pressed into a housing\'s bore of d2; a shaft of d1 runs in it. It offers Ø<d1> bushing/axis (a shaft through it: Through a line; over a shaft: Over a shaft)',
  rows: BUSH, size: '10', source: BUSH_SRC, settings: [{ key: 'length', label: 'Length, mm', type: 'number', default: 10 }], cannot: needLength,
  recipe: ([d1, d2], size, set) => made(`Ø${size} bushing`, 'bronze', { tube: [mm(d1) / 2, mm(d2) / 2, len(set)] }, { color: BRONZE }),
  expect: ([d1, d2], _s, set) => ({ bound: [mm(d2), len(set), mm(d2)], mass: ann(mm(d2), mm(d1)) * len(set) * rho('bronze'), tol: 0.01, massTol: 0.02, says: 'its outside by its length; nominal mass, the tube in bronze' }),
  tests: sizeTest(['Ø10 bushing/axis'], 1),
};
const FLANGEBUSH_F: PartFamily<(typeof BUSH)[string]> = {
  id: 'piece.flangebushing', name: 'Plain bushing (flanged)', gloss: 'A flanged bronze bushing (ISO 4379 form F) by its bore and length', domains: ['mechanical', 'manufacturing', 'everyday'], aisle: 'Bearings / Plain bushings',
  says: 'A flanged plain bushing of sintered bronze (ISO 4379 form F, bores 3 to 50 mm): its sleeve d1 × d2 and its flange d3 × b2 at one end, turned as one; pressed into a bore of d2 it stops on its flange, which takes a thrust. It offers Ø<d1> flanged bushing/axis',
  rows: BUSH, size: '10', source: BUSH_SRC, settings: [{ key: 'length', label: 'Length overall, mm', type: 'number', default: 10 }],
  cannot: ([, , , b2], _s, set) => (len(set) > mm(b2) ? null : `longer than its flange (${b2} mm)`),
  recipe: ([d1, d2, d3, b2], size, set) => { const L = len(set) * 1000;
    return made(`Ø${size} flanged bushing`, 'bronze', { lathe: { pts: ([[d1 / 2, 0], [d3 / 2, 0], [d3 / 2, b2], [d2 / 2, b2], [d2 / 2, L], [d1 / 2, L]] as P2[]).map(([a, b]) => [mm(a), mm(b)] as P2), bore: mm(d1) / 2 } }, { color: BRONZE }); },
  expect: ([d1, d2, d3, b2], _s, set) => ({ bound: [mm(d3), len(set), mm(d3)], mass: (ann(mm(d3), mm(d1)) * mm(b2) + ann(mm(d2), mm(d1)) * (len(set) - mm(b2))) * rho('bronze'), tol: 0.01, massTol: 0.03, says: 'its flange across by its length; nominal mass, flange and sleeve in bronze' }),
  tests: sizeTest(['Ø10 flanged bushing/axis'], 1),
};
// ==== gears =========================================================================================================
const inv = (a: number) => Math.tan(a) - a;
/** A closed outline with a hole (as one outline: the hole joined to it by a cut of no width), mm in, m out. */
function withHole(outer: P2[], hole: P2[]): P2[] { return [...outer, outer[0]!, ...hole, hole[0]!].map(([x, y]) => [mm(x), mm(y)] as P2); }
const circle = (R: number, n = 48, a0 = 0): P2[] => Array.from({ length: n }, (_, k) => [R * Math.cos(a0 + (2 * Math.PI * k) / n), R * Math.sin(a0 + (2 * Math.PI * k) / n)] as P2);
/** Bevel gears, straight teeth, shaft angle 90° (the stock of makers such as KHK: modules 1 to 3, mitres 1:1 and pairs
 *  2:1 and 3:1, typical): module, its teeth, its mate's teeth, face width, hub diameter and length, bore, mm. */
type BevelRow = { m: number; z: number; zm: number; b: number; hub: number; hl: number; bore: number };
const BEVEL: Record<string, BevelRow> = {};
for (const m of [1, 1.5, 2, 2.5, 3]) for (const [z, zm] of [[20, 20], [25, 25], [30, 30], [15, 30], [30, 15], [20, 40], [40, 20], [15, 45], [45, 15]] as const) {
  const d = m * z, Re = (m * Math.hypot(z, zm)) / 2, b = Math.min(10 * m, Re / 3);
  BEVEL[`m${m} z${z}/${zm}`] = { m, z, zm, b: +b.toFixed(1), hub: +Math.min(0.6 * d, d - 2.5 * m).toFixed(1), hl: +(0.6 * b + 2 * m).toFixed(1), bore: Math.max(4, Math.round(d / 6)) };
}
const bevelGeom = (r: BevelRow) => { const dl = Math.atan(r.z / r.zm), d = r.m * r.z, da = d + 2 * r.m * Math.cos(dl), Re = d / (2 * Math.sin(dl)), k = 1 - r.b / Re; return { dl, d, da, Re, small: (da / 2) * k, h: r.b * Math.cos(dl) }; };
const BEVEL_F: PartFamily<BevelRow> = {
  id: 'piece.bevelgear', name: 'Bevel gear', gloss: 'A straight bevel gear (shaft angle 90°) by its module, its teeth and its mate\'s: hub and toothed cone', domains: ['mechanical', 'manufacturing', 'vehicles'], aisle: 'Power transmission / Gears',
  says: 'A straight bevel gear for shafts at 90° (ISO 23509\'s geometry: pitch cone angle atan(z/z₂), outside diameter m z + 2 m cos δ, face width at most a third of its cone distance or 10 m; modules 1 to 3, mitres and 2:1, 3:1 pairs as makers stock them, typical): its hub and its toothed cone stacked along its axis, its bore through both. An envelope of its teeth: the cone drawn as the frustum its tips sweep. It meshes with its mate (z/z₂ the other way round) on a shaft at right angles. It offers <name> hub/axis (Through a line, its shaft)',
  rows: BEVEL, size: 'm1 z20/20', source: 'ISO 23509 straight bevel geometry worked from module and teeth; the stock modules, ratios, hubs and bores typical of makers\' tables (KHK SB, MBSG, recalled)',
  envelope: 'its teeth drawn as the frustum their tips sweep (its face cone), no teeth cut',
  cannot: (r) => (r.bore < r.hub - 2 ? null : `its bore (${r.bore} mm) within its hub (${r.hub} mm)`),
  recipe: (r, size) => { const g = bevelGeom(r), name = `${size} bevel gear`;
    return stack(name, 1, [{ b: made(`${name} hub`, 'steel-low', { tube: [mm(r.bore) / 2, mm(r.hub) / 2, mm(r.hl)] }) }, { b: made(`${name} teeth`, 'steel-low', { cone: [mm(g.da) / 2, mm(g.small), mm(g.h), mm(r.bore) / 2] }) }]); },
  expect: (r) => { const g = bevelGeom(r); return { bound: [mm(g.da), mm(r.hl + g.h), mm(g.da)], tol: 0.01, says: `its outside diameter m z + 2m cos δ (δ ${(g.dl * 180 / Math.PI).toFixed(1)}°) by hub and face` }; },
  tests: sizeTest(['m1 z20/20 bevel gear hub/axis', 'm1 z20/20 bevel gear teeth/axis'], 2),
};
/** Worms, single start, diameter quotient q (DIN 3976's preferred q 10 at these modules, typical of makers' stock):
 *  module m, q, and the worm's length in axial pitches, mm. */
const WORMS: Record<string, { m: number; q: number }> = Object.fromEntries([0.5, 0.8, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5].map((m) => [`m${m}`, { m, q: 10 }]));
const wormGeom = (w: { m: number; q: number }) => { const d1 = w.q * w.m, p = Math.PI * w.m, df = d1 - 2.4 * w.m, wire = 2.2 * w.m, turns = 6; return { d1, p, df, wire, turns, L: turns * p + wire + 2 * w.m }; };
const WORM_F: PartFamily<{ m: number; q: number }> = {
  id: 'piece.worm', name: 'Worm', gloss: 'A single-start worm by its module (q 10): its core and its thread six pitches long', domains: ['mechanical', 'manufacturing'], aisle: 'Power transmission / Gears',
  says: 'A single-start steel worm (DIN 3975 geometry, axial module 0.5 to 5, diameter quotient q 10, typical): its core at its root diameter d₁ − 2.4 m, its thread (2.2 m deep, its axial pitch π m) laid over it as a coil six turns long. Approximated: the thread\'s section round, not its 20° flanks. It drives a worm wheel of its module (piece.wormwheel) at right angles, their axes (d₁ + m z₂) / 2 apart. It offers m<n> worm core/axis (its shaft: Through a line)',
  rows: WORMS, size: 'm1', source: 'DIN 3975 worm geometry; q 10 typical of makers\' stock (KHK KWG, recalled)',
  recipe: (w, size) => { const g = wormGeom(w), name = `${size} worm`;
    return over(made(`${name} core`, 'steel-alloy', { cyl: [mm(g.df) / 2, mm(g.L)] }, { color: STEEL }), `${name} core/axis`, made(`${name} thread`, 'steel-alloy', { coil: [mm(g.df / 2 + g.wire / 2), mm(g.wire), g.turns, mm(g.p)] }, { color: STEEL }), 'mid', 'touch'); },
  expect: (w) => { const g = wormGeom(w); return { bound: [mm(g.df + 2 * g.wire), mm(g.L), mm(g.df + 2 * g.wire)], tol: 0.01, says: 'its tip diameter (d₁ + 2 m less its thread\'s round) by its length' }; },
  tests: sizeTest(['m1 worm core/axis', 'm1 worm thread/axis'], 2),
};
type WheelRow = { m: number; z: number; b: number; bore: number };
const WHEELS: Record<string, WheelRow> = {};
for (const m of [0.5, 0.8, 1, 1.25, 1.5, 2, 2.5, 3]) for (const z of [20, 25, 30, 40, 50, 60]) WHEELS[`m${m} z${z}`] = { m, z, b: +(0.75 * 10 * m).toFixed(1), bore: Math.max(3, Math.min(Math.round(m * z / 4), Math.floor(m * z - 4.5 * m) - 1)) };
const WHEEL_F: PartFamily<WheelRow> = {
  id: 'piece.wormwheel', name: 'Worm wheel', gloss: 'A worm wheel by its module and teeth (ratio z:1 with a single-start worm), its face 0.75 of its worm\'s diameter', domains: ['mechanical', 'manufacturing'], aisle: 'Power transmission / Gears',
  says: 'A bronze worm wheel by its module and teeth (20 to 60: its ratio with a single-start worm), its face width 0.75 d₁ of its worm (q 10), its bore through it (typical). Approximated: drawn as a spur gear of its module (ISO 53\'s 20° involute rack), its throat and its teeth\'s hobbed curve not drawn; its axis along z. It meshes with a worm of its module (piece.worm), their axes (d₁ + m z) / 2 apart',
  rows: WHEELS, size: 'm1 z30', source: 'DIN 3975 geometry; tooth counts and face width typical of makers\' stock (KHK, recalled)',
  recipe: (w) => gear(w.m, w.z, mm(w.b), mm(w.bore), 'bronze'),
  expect: (w) => ({ bound: [mm(w.m * (w.z + 2)), mm(w.m * (w.z + 2)), mm(w.b)], tol: 0.01, says: 'its tip diameter m(z + 2) by its face' }),
  tests: [{ inputs: {}, outputs: { pieces: 1 } }],
};
/** Gear racks (ISO 53's basic rack, 20°), as makers stock them (KHK SR and SRF, recalled, typical): module → face
 *  width b and height H (to the pitch line plus its addendum), mm. */
const RACKS: Record<string, [number, number, number]> = { 'm0.5': [0.5, 5, 5], 'm0.8': [0.8, 8, 8], m1: [1, 10, 10], 'm1.25': [1.25, 12, 12], 'm1.5': [1.5, 15, 15], m2: [2, 20, 20], 'm2.5': [2.5, 25, 25], m3: [3, 30, 30], m4: [4, 40, 40], m5: [5, 50, 50], m6: [6, 60, 60], m8: [8, 80, 80] };
const rackTeeth = (m: number, L: number) => Math.floor(L / (Math.PI * m));
const RACK_F: PartFamily<[number, number, number]> = {
  id: 'piece.rack', name: 'Gear rack', gloss: 'A spur gear rack by its module and length: ISO 53\'s straight-sided teeth along its top', domains: ['mechanical', 'manufacturing'], aisle: 'Power transmission / Gears',
  says: 'A steel gear rack (module 0.5 to 8; face and height as makers stock them, typical): its side outline drawn exactly by ISO 53\'s basic rack (pitch π m, addendum m above the pitch line, dedendum 1.25 m below it, flanks at 20°, half a pitch thick on the line) along its length in x, its teeth up, so wide (z). A spur gear of its module rolls along it (a rack and pinion); it offers no line yet (a section\'s line runs along z only through its own origin)',
  rows: RACKS, size: 'm1', source: 'ISO 53 basic rack profile; faces and heights typical of makers\' racks (KHK SR, SRF, recalled)',
  settings: [{ key: 'length', label: 'Length, mm', type: 'number', default: 200 }],
  cannot: ([m], _s, set) => (rackTeeth(m, len(set) * 1000) >= 2 ? null : `at least two teeth (${(2 * Math.PI * m).toFixed(1)} mm) long`),
  recipe: ([m, b, H], size, set) => { const p = Math.PI * m, n = rackTeeth(m, len(set) * 1000), L = n * p, yr = H - 2.25 * m, t = Math.tan((20 * Math.PI) / 180), rw = p / 4 + 1.25 * m * t, tw = p / 4 - m * t;
    // (each tooth half a pitch thick on its pitch line (m below its tip), its flanks at 20° from its root (1.25 m below the
    // line) to its tip; a flat root between teeth and at its ends)
    const pts: P2[] = [[0, 0], [L, 0], [L, yr]];
    for (let k = n - 1; k >= 0; k--) { const c = k * p + p / 2; pts.push([c + rw, yr], [c + tw, H], [c - tw, H], [c - rw, yr]); }
    pts.push([0, yr]);
    return made(`${size} rack`, 'steel-low', { section: { pts: pts.map(([x, y]) => [mm(x - L / 2), mm(y - H / 2)] as P2), L: mm(b) } }); },
  expect: ([m, b, H], _s, set) => { const n = rackTeeth(m, len(set) * 1000), L = n * Math.PI * m; return { bound: [mm(L), mm(H), mm(b)], mass: rackArea(m, H) * n * mm(b) * rho('steel-low'), tol: 0.01, massTol: 0.02, says: 'its teeth\'s length by its height to the tips and its face; nominal mass, the profile\'s area (its body to the root line and a trapezoid a tooth) by its face' }; },
  tests: [{ inputs: {}, outputs: { pieces: 1 } }],
};
/** A rack's area a pitch (m²): its body to the root line and one tooth's trapezoid from root to tip. */
function rackArea(m: number, H: number): number { const p = Math.PI * m, t = Math.tan((20 * Math.PI) / 180), rw = p / 4 + 1.25 * m * t, tw = p / 4 - m * t; return mm(mm(p * (H - 2.25 * m) + (rw + tw) * 2.25 * m)); }
/** Internal (ring) gears by module and teeth, outside m(z + 16) and face 8 m (typical of makers' stock, KHK SI,
 *  recalled), mm. */
type RingRow = { m: number; z: number; OD: number; b: number };
const RINGS: Record<string, RingRow> = {};
for (const m of [0.5, 0.8, 1, 1.5, 2]) for (const z of [40, 50, 60, 80, 100]) RINGS[`m${m} z${z}`] = { m, z, OD: m * (z + 16), b: Math.max(5, 8 * m) };
function ringOutline(r: RingRow): P2[] {
  const { m, z } = r, PA = (20 * Math.PI) / 180, R = (m * z) / 2, rb = R * Math.cos(PA), ra = R - m, rf = R + 1.25 * m;
  // (a ring gear's tooth spaces are an external gear's teeth turned inside out: each space at radius ρ as wide as that
  // gear's tooth, π/(2z) + inv α − inv α_ρ either side, from its tips (R − m) out to its roots (R + 1.25 m))
  const psi = (q: number) => Math.PI / (2 * z) + inv(PA) - (q > rb ? inv(Math.acos(rb / q)) : 0), at = (q: number, a: number): P2 => [q * Math.cos(a), q * Math.sin(a)];
  const radii = Array.from({ length: 5 }, (_, k) => Math.max(ra, rb) + (k / 4) * (rf - Math.max(ra, rb))), pts: P2[] = [];
  for (let k = 0; k < z; k++) { const th = (2 * Math.PI * k) / z; pts.push(at(ra, th - Math.PI / z)); if (ra < rb) pts.push(at(ra, th - psi(rb))); for (const q of radii) pts.push(at(q, th - psi(q))); for (const q of [...radii].reverse()) pts.push(at(q, th + psi(q))); if (ra < rb) pts.push(at(ra, th + psi(rb))); }
  return withHole(circle(r.OD / 2, 96, -Math.PI / z), pts.reverse());
}
const RING_F: PartFamily<RingRow> = {
  id: 'piece.internalgear', name: 'Internal gear', gloss: 'An internal (ring) spur gear by its module and teeth: its teeth inside a plain rim', domains: ['mechanical', 'manufacturing', 'vehicles'], aisle: 'Power transmission / Gears',
  says: 'An internal spur gear (module 0.5 to 2, 40 to 100 teeth; its rim m(z + 16) across and 8 m wide, typical): its teeth cut inside its rim by ISO 53\'s 20° rack turned inside out (involute spaces from its tips at m z/2 − m out to its roots at m z/2 + 1.25 m; the root fillet not drawn), drawn along its face (z). A pinion of its module runs inside it, their axes m(z − z₁)/2 apart (planetary sets)',
  rows: RINGS, size: 'm1 z60', source: 'ISO 53 basic rack; rim and face typical of makers\' internal gears (KHK SI, recalled)',
  recipe: (r, size) => made(`${size} internal gear`, 'steel-low', { section: { pts: ringOutline(r), L: mm(r.b) } }),
  expect: (r) => ({ bound: [mm(r.OD), mm(r.OD), mm(r.b)], tol: 0.01, says: 'its rim across by its face' }),
  tests: [{ inputs: {}, outputs: { pieces: 1 } }],
};
// ==== timing pulleys and belts ======================================================================================
/** Timing belt profiles (Gates HTD and DIN 7721 T, typical of their tables): pitch p, pitch line offset u (half the
 *  pulley's pitch diameter less its outside), the groove's depth h, its width at the top w and at its bottom wb (wb 0: a
 *  round bottom of radius w / 2), the belt's thickness s, the widths sold, mm. */
const PROFILES: Record<string, { p: number; u: number; h: number; w: number; wb: number; s: number; widths: number[] }> = {
  '3M': { p: 3, u: 0.381, h: 1.14, w: 1.78, wb: 0, s: 2.4, widths: [6, 9, 15] }, '5M': { p: 5, u: 0.5715, h: 2.06, w: 3.05, wb: 0, s: 3.8, widths: [9, 15, 25] },
  T5: { p: 5, u: 0.425, h: 1.25, w: 2.96, wb: 1.8, s: 2.2, widths: [10, 16, 25] }, T10: { p: 10, u: 0.925, h: 2.6, w: 6.05, wb: 3.6, s: 4.5, widths: [16, 25, 32] },
};
type PulleyRow = { pr: string; z: number };
const PULLEY_Z: Record<string, number[]> = { '3M': [10, 12, 14, 15, 16, 18, 20, 22, 24, 25, 26, 28, 30, 32, 34, 36, 40, 44, 48, 50, 56, 60, 72], '5M': [12, 14, 15, 16, 18, 20, 22, 24, 25, 26, 28, 30, 32, 34, 36, 38, 40, 44, 48, 50, 56, 60, 72], T5: [10, 12, 14, 15, 16, 18, 20, 22, 24, 25, 27, 30, 32, 36, 40, 42, 44, 48, 60], T10: [12, 14, 15, 16, 18, 20, 22, 24, 25, 27, 30, 32, 36, 40, 44, 48, 60] };
const pulleyRows = (keys: string[]): Record<string, PulleyRow> => Object.fromEntries(keys.flatMap((pr) => PULLEY_Z[pr]!.map((z) => [`${pr} ${z}T`, { pr, z }])));
const pulleyR = (r: PulleyRow) => { const P = PROFILES[r.pr]!; return { P, Rp: (r.z * P.p) / Math.PI / 2, R: (r.z * P.p) / Math.PI / 2 - P.u }; };
const pulleyBore = (r: PulleyRow) => { const { P, R } = pulleyR(r); return Math.max(3, Math.min(Math.round(0.3 * 2 * R), Math.floor(2 * (R - P.h - 2)))); };
function pulleyOutline(r: PulleyRow): P2[] {
  const { P, R } = pulleyR(r), z = r.z, pts: P2[] = [];
  for (let k = 0; k < z; k++) { const th = (2 * Math.PI * (k + 0.5)) / z, u: P2 = [Math.cos(th), Math.sin(th)], v: P2 = [-Math.sin(th), Math.cos(th)], at = (a: number, b: number): P2 => [a * u[0] + b * v[0], a * u[1] + b * v[1]];
    const hw = P.w / 2, d = Math.asin(hw / R);
    pts.push([R * Math.cos(th - d), R * Math.sin(th - d)]);
    if (P.wb === 0) { const rho = hw, Rc = R - P.h + rho; for (const f of [270, 225, 180, 135, 90]) { const a = (f * Math.PI) / 180; pts.push(at(Rc + rho * Math.cos(a), rho * Math.sin(a))); } }
    else pts.push(at(R - P.h, -P.wb / 2), at(R - P.h, P.wb / 2));
    pts.push([R * Math.cos(th + d), R * Math.sin(th + d)]); }
  return pts;
}
const PULLEY_DOC = 'its teeth along its axis (z) between two flanges 1 mm thick and 2 mm over its outside, a hub 0.6 of its face long and its outside across, its bore through all (a pilot, typical)';
const pulleyOf = (r: PulleyRow, size: string, set: Record<string, unknown>): Block => {
  const { R } = pulleyR(r), b = Number(set.width) || PROFILES[r.pr]!.widths[0]!, B = pulleyBore(r), name = `${size} pulley`, Rf = R + 2;
  const hole = circle(B / 2, 32).reverse(), disc = (part: string, L: number, Rx: number) => made(`${name} ${part}`, 'al-6061', { section: { pts: withHole(circle(Rx), hole), L } }, { color: ALU });
  return stack(name, 2, [{ b: disc('hub', mm(0.6 * b + 4), R) }, { b: disc('flange', mm(1), Rf) }, { b: made(`${name} teeth`, 'al-6061', { section: { pts: withHole(pulleyOutline(r), hole), L: mm(b + 1) } }, { color: ALU }) }, { b: disc('flange', mm(1), Rf) }]);
};
const pulleyExpect = (r: PulleyRow, _s: string, set: Record<string, unknown>): Expect => { const { R } = pulleyR(r), b = Number(set.width) || PROFILES[r.pr]!.widths[0]!; return { bound: [mm(2 * R + 4), mm(2 * R + 4), mm(0.6 * b + 4 + 2 + b + 1)], tol: 0.01, says: `its flanges across (its outside ${(2 * R).toFixed(2)} mm, z p / π less 2u) by hub, flanges and teeth` }; };
const widthSet = (d: number) => ({ key: 'width', label: 'Belt width, mm', type: 'number' as const, default: d });
const widthOk = (r: PulleyRow, _s: string, set: Record<string, unknown>) => (Number(set.width) > 0 ? null : `a belt width above 0 (${String(set.width)} mm; ${r.pr} belts come ${PROFILES[r.pr]!.widths.join(', ')} mm wide)`);
const HTD_F: PartFamily<PulleyRow> = {
  id: 'piece.htdpulley', name: 'HTD timing pulley', gloss: 'An HTD 3M or 5M timing pulley by its teeth and belt width: hub, flanges and curvilinear teeth', domains: ['mechanical', 'manufacturing'], aisle: 'Power transmission / Belts and pulleys',
  says: `An HTD timing pulley, 3 mm (3M) or 5 mm (5M) pitch (Gates HTD: its pitch diameter z p / π, its outside 2u less, u 0.381 or 0.5715 mm; its grooves round-bottomed 1.14 or 2.06 mm deep, approximated): ${PULLEY_DOC}. A belt of its pitch goes round it (piece.timingbelt)`,
  rows: pulleyRows(['3M', '5M']), size: '3M 20T', source: 'Gates HTD (pitch, pitch line offset, tooth heights, typical of its tables); tooth counts as makers stock them, typical',
  settings: [widthSet(9)], cannot: widthOk, recipe: pulleyOf, expect: pulleyExpect,
  tests: [{ inputs: {}, outputs: { pieces: 4 } }],
};
const T_F: PartFamily<PulleyRow> = {
  id: 'piece.tpulley', name: 'T-profile timing pulley', gloss: 'A T5 or T10 timing pulley (DIN 7721) by its teeth and belt width: hub, flanges and trapezoidal teeth', domains: ['mechanical', 'manufacturing'], aisle: 'Power transmission / Belts and pulleys',
  says: `A T-profile timing pulley, T5 or T10 (DIN 7721: its pitch diameter z p / π, its outside 0.85 or 1.85 mm less; its grooves trapezoidal, 1.25 or 2.6 mm deep, typical): ${PULLEY_DOC}. A T belt of its pitch goes round it (piece.timingbelt)`,
  rows: pulleyRows(['T5', 'T10']), size: 'T5 20T', source: 'DIN 7721 (pitch, pitch line differential, groove, typical of makers\' tables); tooth counts as makers stock them, typical',
  settings: [widthSet(10)], cannot: widthOk, recipe: pulleyOf, expect: pulleyExpect,
  tests: [{ inputs: {}, outputs: { pieces: 4 } }],
};
/** A closed belt laid as a run round two equal pulleys of pitch radius R: its straights and its half turns. */
function beltLoop(name: string, L: number, R: number, area: number, mat: string, color: number): Block {
  const C = (L - 2 * Math.PI * R) / 2, t = { mat, ro: mm(Math.sqrt(area / Math.PI)), color };
  const segs: RunSeg[] = [{ ...t, name: `${name} straight A`, straight: mm(C) }, { ...t, name: `${name} round A`, bend: 180, R: mm(R) }, { ...t, name: `${name} straight B`, straight: mm(C) }, { ...t, name: `${name} round B`, bend: 180, R: mm(R) }];
  return run(name, segs);
}
const loopExpect = (L: number, R: number, area: number, mat: string): Expect => { const r = Math.sqrt(area / Math.PI), C = (L - 2 * Math.PI * R) / 2; return { bound: [mm(2 * R + 2 * r), mm(C + 2 * R + 2 * r), mm(2 * r)], mass: mm(mm(area)) * mm(L) * rho(mat), tol: 0.01, massTol: 0.03, says: 'its run\'s bound; nominal mass, its section by its length' }; };
const loopCannot = (L: number, R: number, size: string) => (L - 2 * Math.PI * R > 0 ? null : `a ${size} belt has no straights round two such pulleys (once round them is ${(2 * Math.PI * R).toFixed(1)} mm): smaller pulleys or a longer belt`);
/** Timing belts by profile and pitch length (lengths in whole pitches as Gates and makers stock them, typical). */
type BeltRow = { pr: string; L: number };
const BELT_L: Record<string, number[]> = { '3M': [111, 129, 147, 168, 201, 225, 252, 270, 300, 339, 384, 420, 474, 501, 564, 600, 669, 735, 801, 882, 1062, 1200], '5M': [255, 300, 350, 400, 450, 500, 535, 565, 600, 650, 700, 750, 800, 850, 900, 1000, 1125, 1270, 1420, 1595, 1800], T5: [220, 260, 300, 330, 365, 400, 420, 455, 480, 500, 550, 600, 650, 700, 750, 840, 900, 1000], T10: [400, 500, 530, 610, 630, 700, 720, 800, 840, 900, 960, 1010, 1080, 1150, 1250, 1350, 1500] };
const TBELTS: Record<string, BeltRow> = Object.fromEntries(Object.entries(BELT_L).flatMap(([pr, Ls]) => Ls.map((L) => [`${pr}-${L}`, { pr, L }])));
const tbR = (r: BeltRow, set: Record<string, unknown>) => (Number(set.teeth) * PROFILES[r.pr]!.p) / Math.PI / 2;
const TBELT_F: PartFamily<BeltRow> = {
  id: 'piece.timingbelt', name: 'Timing belt loop (HTD, T)', gloss: 'A closed HTD 3M/5M or T5/T10 timing belt by its pitch length, laid round two equal pulleys', domains: ['mechanical', 'manufacturing'], aisle: 'Power transmission / Belts and pulleys',
  says: 'A closed timing belt, HTD 3M or 5M or T5 or T10, by its pitch length (in whole pitches: 3M-201 is 67 teeth), so wide, laid as a run round two equal pulleys of so many teeth: two straights and two half turns on their pitch circles. Approximated: drawn as a round cord of its section\'s area (its width by its thickness), its teeth not drawn. Its straights offer their axes',
  rows: TBELTS, size: '3M-201', source: 'Gates HTD and DIN 7721 T belt pitches and thicknesses; the lengths as makers stock them, typical',
  settings: [{ key: 'teeth', label: 'Pulley teeth (both)', type: 'number', default: 16 }, widthSet(9)],
  cannot: (r, size, set) => (!(Number.isInteger(Number(set.teeth)) && Number(set.teeth) >= 10) ? `pulleys of 10 teeth or more (${String(set.teeth)})` : !(Number(set.width) > 0) ? 'a width above 0' : loopCannot(r.L, tbR(r, set), size)),
  recipe: (r, size, set) => beltLoop(`${size} belt`, r.L, tbR(r, set), Number(set.width) * PROFILES[r.pr]!.s, 'nbr', RUBBER),
  expect: (r, _s, set) => loopExpect(r.L, tbR(r, set), Number(set.width) * PROFILES[r.pr]!.s, 'nbr'),
  tests: [{ inputs: {}, outputs: { pieces: 4 } }],
};
// ==== roller chain and sprockets ====================================================================================
/** Roller chain (ANSI B29.1 and ISO 606 B, their tables as makers print them, typical): pitch p, roller Dr, inner width
 *  b1, plate height h, plate thickness t, mass a metre (kg), mm. */
const CHAINS: Record<string, { p: number; Dr: number; b1: number; h: number; t: number; kgm: number }> = {
  'ANSI 25': { p: 6.35, Dr: 3.3, b1: 3.18, h: 5.9, t: 0.76, kgm: 0.14 }, 'ANSI 35': { p: 9.525, Dr: 5.08, b1: 4.77, h: 9, t: 1.27, kgm: 0.33 }, 'ANSI 40': { p: 12.7, Dr: 7.92, b1: 7.85, h: 12, t: 1.52, kgm: 0.62 },
  'ANSI 50': { p: 15.875, Dr: 10.16, b1: 9.4, h: 15, t: 2.03, kgm: 1.02 }, 'ANSI 60': { p: 19.05, Dr: 11.91, b1: 12.57, h: 18, t: 2.42, kgm: 1.5 }, 'ANSI 80': { p: 25.4, Dr: 15.88, b1: 15.75, h: 24, t: 3.25, kgm: 2.6 },
  'ISO 04B': { p: 6, Dr: 4, b1: 2.8, h: 5, t: 0.6, kgm: 0.11 }, 'ISO 05B': { p: 8, Dr: 5, b1: 3, h: 7.1, t: 0.8, kgm: 0.2 }, 'ISO 06B': { p: 9.525, Dr: 6.35, b1: 5.72, h: 8.2, t: 1.3, kgm: 0.41 },
  'ISO 08B': { p: 12.7, Dr: 8.51, b1: 7.75, h: 11.8, t: 1.6, kgm: 0.7 }, 'ISO 10B': { p: 15.875, Dr: 10.16, b1: 9.65, h: 14.7, t: 1.7, kgm: 0.95 }, 'ISO 12B': { p: 19.05, Dr: 12.07, b1: 11.68, h: 16, t: 1.85, kgm: 1.25 },
  'ISO 16B': { p: 25.4, Dr: 15.88, b1: 17.02, h: 21, t: 3.1, kgm: 2.7 },
};
const CHAIN_SRC = 'ANSI B29.1 and ISO 606 (B series) chain dimensions as makers\' tables print them, recalled, read from no source here: typical';
const CHAIN_F: PartFamily<(typeof CHAINS)[string]> = {
  id: 'piece.rollerchain', name: 'Roller chain', gloss: 'A straight length of roller chain (ANSI 25 to 80, ISO 04B to 16B) by its size and links', domains: ['mechanical', 'manufacturing', 'vehicles'], aisle: 'Power transmission / Chain and sprockets',
  says: 'A straight length of simplex roller chain by its size and so many links (pitch, roller, inner width, plates as ANSI B29.1 and ISO 606 B give them, typical): each link its two side plates with its roller between, stacked across, the links end to end along x one pitch each. Approximated: inner and outer plates drawn alike, one pitch long, straight-sided, its pins and bushings within its rollers. A sprocket of its size (piece.sprocket) takes it; its mass a metre in its row',
  rows: CHAINS, size: 'ISO 08B', source: CHAIN_SRC,
  settings: [{ key: 'links', label: 'Links', type: 'number', default: 10 }],
  cannot: (_c, _s, set) => (Number.isInteger(Number(set.links)) && Number(set.links) >= 1 && Number(set.links) <= 200 ? null : `1 to 200 links (${String(set.links)})`),
  recipe: (c, size, set) => { const n = Number(set.links), name = `${size} chain`, link = (i: number) => stack(`${name} link ${i + 1}`, 1, [{ b: made(`${name} plate ${i + 1}a`, 'steel-alloy', { box: [mm(c.p), mm(c.t), mm(c.h)] }, { color: 0x5a5d62 }) }, { b: made(`${name} roller ${i + 1}`, 'steel-alloy', { cyl: [mm(c.Dr) / 2, mm(c.b1)] }, { color: STEEL }) }, { b: made(`${name} plate ${i + 1}b`, 'steel-alloy', { box: [mm(c.p), mm(c.t), mm(c.h)] }, { color: 0x5a5d62 }) }]);
    return stack(name, 0, Array.from({ length: n }, (_, i) => ({ b: link(i) }))); },
  expect: (c, _s, set) => ({ bound: [mm(Number(set.links) * c.p), mm(c.b1 + 2 * c.t), mm(c.h)], tol: 0.01, says: `its links by its width over the plates and its plates' height (its row's mass ${c.kgm} kg a metre)` }),
  tests: [{ inputs: {}, outputs: { pieces: 30 } }],
};
type SprocketRow = { chain: string; z: number };
const SPROCKET_Z = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 28, 30, 32, 35, 36, 38, 40, 42, 45, 48, 54, 60];
const SPROCKET_CHAINS = ['ANSI 25', 'ANSI 35', 'ANSI 40', 'ANSI 50', 'ANSI 60', 'ISO 06B', 'ISO 08B', 'ISO 10B', 'ISO 12B'];
const SPROCKETS: Record<string, SprocketRow> = Object.fromEntries(SPROCKET_CHAINS.flatMap((chain) => SPROCKET_Z.map((z) => [`${chain} ${z}T`, { chain, z }])));
const sprocketGeom = (r: SprocketRow) => { const c = CHAINS[r.chain]!, a = Math.PI / r.z, Rp = c.p / (2 * Math.sin(a)), Ro = (c.p * (0.6 + 1 / Math.tan(a))) / 2, rs = (1.005 * c.Dr + 0.076) / 2, tw = 0.93 * c.b1;
  return { c, a, Rp, Ro, rs, tw, bore: Math.max(4, Math.min(Math.round(0.35 * Rp), Math.floor(2 * (Rp - rs - 0.6 * c.p)))) }; };
function sprocketOutline(r: SprocketRow): P2[] {
  const g = sprocketGeom(r), pts: P2[] = [], beta = (75 * Math.PI) / 180;
  for (let k = 0; k < r.z; k++) { const th = 2 * g.a * k, cx = g.Rp * Math.cos(th), cy = g.Rp * Math.sin(th);
    // (its roller's seat: an arc about the roller's centre on the pitch circle, facing in, then the flank out to the tip)
    for (let j = 0; j <= 6; j++) { const al = th + Math.PI + beta - (2 * beta * j) / 6; pts.push([cx + g.rs * Math.cos(al), cy + g.rs * Math.sin(al)]); }
    pts.push([g.Ro * Math.cos(th + g.a), g.Ro * Math.sin(th + g.a)]); }
  return pts;
}
const SPROCKET_F: PartFamily<SprocketRow> = {
  id: 'piece.sprocket', name: 'Roller chain sprocket', gloss: 'A plate sprocket for roller chain (ANSI 25 to 60, ISO 06B to 12B) by its chain and teeth', domains: ['mechanical', 'manufacturing', 'vehicles'], aisle: 'Power transmission / Chain and sprockets',
  says: 'A plate sprocket (no hub, type A) for simplex roller chain by its chain and teeth (9 to 60): its pitch diameter p / sin(180°/z), its outside p(0.6 + cot(180°/z)) and its rollers\' seats 1.005 Dr + 0.076 mm across (ANSI B29.1), its teeth 0.93 of the chain\'s inner width thick, its bore a pilot (typical), drawn along its axis (z). Approximated: each tooth\'s flank straight from its seat to its tip, no topping curve or chamfer. The chain of its size (piece.rollerchain) wraps it',
  rows: SPROCKETS, size: 'ISO 08B 20T', source: 'ANSI B29.1 sprocket formulas worked from the chain\'s pitch and roller (the chains as their tables give them, typical)',
  recipe: (r, size) => { const g = sprocketGeom(r); return made(`${size} sprocket`, 'steel-low', { section: { pts: withHole(sprocketOutline(r), circle(g.bore / 2, 32).reverse()), L: mm(g.tw) } }, { color: 0x6a6d72 }); },
  expect: (r) => { const g = sprocketGeom(r), tips = Array.from({ length: r.z }, (_, k) => (2 * k + 1) * g.a), span = (f: (a: number) => number) => mm(g.Ro) * (Math.max(...tips.map(f)) - Math.min(...tips.map(f)));
    return { bound: [span(Math.cos), span(Math.sin), mm(g.tw)], tol: 0.01, says: `its tips on its outside p(0.6 + cot(180°/z)) (${(2 * g.Ro).toFixed(2)} mm across), the bound across its tips (an odd count's tips are not opposite), by its tooth's width` }; },
  tests: [{ inputs: {}, outputs: { pieces: 1 } }],
};
// ==== V-belt pulleys and V-belts (ISO 4183, ISO 4184) ===================================================================
/** Narrow V-belt grooves (ISO 4183, as makers' tables give them, typical): datum width bd, height above the datum c,
 *  depth below it h, groove pitch e, edge f, the datum diameter at and below which the groove is 34° (else 38°), the
 *  belt's top width and height (ISO 4184), mm. */
const VSEC: Record<string, { bd: number; c: number; h: number; e: number; f: number; small: number; top: number; ht: number }> = {
  SPZ: { bd: 8.5, c: 2, h: 9, e: 12, f: 8, small: 80, top: 9.7, ht: 8 }, SPA: { bd: 11, c: 2.75, h: 11, e: 15, f: 10, small: 118, top: 12.7, ht: 10 }, SPB: { bd: 14, c: 3.5, h: 14, e: 19, f: 12.5, small: 190, top: 16.3, ht: 13 },
};
const VDIA: Record<string, number[]> = { SPZ: [63, 71, 75, 80, 85, 90, 95, 100, 106, 112, 118, 125, 132, 140, 150, 160, 170, 180, 190, 200, 224, 250, 280, 315], SPA: [90, 95, 100, 106, 112, 118, 125, 132, 140, 150, 160, 170, 180, 190, 200, 224, 250, 280, 315, 355, 400], SPB: [140, 150, 160, 170, 180, 190, 200, 224, 250, 280, 315, 355, 400, 450, 500] };
type VRow = { sec: string; dd: number };
const VPULLEYS: Record<string, VRow> = Object.fromEntries(Object.entries(VDIA).flatMap(([sec, ds]) => ds.map((dd) => [`${sec} ${dd}`, { sec, dd }])));
const vBore = (r: VRow) => Math.max(10, Math.round(r.dd / 5));
function vProfile(r: VRow, n: number): P2[] {
  const s = VSEC[r.sec]!, a = ((r.dd <= s.small ? 34 : 38) * Math.PI) / 360, Ro = r.dd / 2 + s.c, Rg = r.dd / 2 - s.h, W = (n - 1) * s.e + 2 * s.f;
  const wt = s.bd + 2 * s.c * Math.tan(a), wb = Math.max(0.5, s.bd - 2 * s.h * Math.tan(a)), pts: P2[] = [[0, 0], [Ro, 0]];
  for (let k = 0; k < n; k++) { const y = s.f + k * s.e; pts.push([Ro, y - wt / 2], [Rg, y - wb / 2], [Rg, y + wb / 2], [Ro, y + wt / 2]); }
  pts.push([Ro, W], [0, W]);
  return pts.map(([x, y]) => [mm(x), mm(y)] as P2);
}
const VPULLEY_F: PartFamily<VRow> = {
  id: 'piece.vpulley', name: 'V-belt pulley', gloss: 'A narrow V-belt pulley (SPZ, SPA, SPB) by its section, datum diameter and grooves: its grooves turned', domains: ['mechanical', 'manufacturing'], aisle: 'Power transmission / Belts and pulleys',
  says: 'A cast-iron V-belt pulley for narrow wedge belts (SPZ, SPA, SPB; datum diameters 63 to 500 mm, the R20 series ISO 4183 lists) with 1 to 4 grooves: its profile turned about its axis (y) with each groove as ISO 4183 gives it (datum width, height above and depth below the datum, 34° at small diameters and 38° above, grooves e apart and f from the faces), its bore a pilot (typical). Approximated: drawn solid (a large pulley\'s web and arms not cut), its taper bush not drawn. Its belt (piece.vbelt) rides its grooves at the datum diameter. It offers <name>/axis (its shaft: Through a line)',
  rows: VPULLEYS, size: 'SPZ 100', source: 'ISO 4183 groove dimensions and datum diameters as makers\' tables give them, typical',
  settings: [{ key: 'grooves', label: 'Grooves', type: 'number', default: 1 }],
  cannot: (_r, _s, set) => ([1, 2, 3, 4].includes(Number(set.grooves)) ? null : `1 to 4 grooves (${String(set.grooves)})`),
  recipe: (r, size, set) => made(`${size} ${Number(set.grooves)}-groove pulley`, 'cast-iron', { lathe: { pts: vProfile(r, Number(set.grooves)), bore: mm(vBore(r)) / 2 } }, { color: IRON }),
  expect: (r, _s, set) => { const s = VSEC[r.sec]!, W = (Number(set.grooves) - 1) * s.e + 2 * s.f, Do = r.dd + 2 * s.c; return { bound: [mm(Do), mm(W), mm(Do)], tol: 0.01, says: 'its outside (datum + 2c) by its face (e and f)' }; },
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['SPZ 100 1-groove pulley/axis'] } }],
};
const VLEN: Record<string, number[]> = { SPZ: [630, 710, 800, 900, 1000, 1120, 1250, 1400, 1600, 1800, 2000, 2240, 2500, 2800, 3150, 3550], SPA: [800, 900, 1000, 1120, 1250, 1400, 1600, 1800, 2000, 2240, 2500, 2800, 3150, 3550, 4000, 4500], SPB: [1250, 1400, 1600, 1800, 2000, 2240, 2500, 2800, 3150, 3550, 4000, 4500, 5000, 5600, 6300, 7100, 8000] };
type VBeltRow = { sec: string; L: number };
const VBELTS: Record<string, VBeltRow> = Object.fromEntries(Object.entries(VLEN).flatMap(([sec, Ls]) => Ls.map((L) => [`${sec} ${L}`, { sec, L }])));
const vArea = (sec: string) => { const s = VSEC[sec]!, bot = s.top - 2 * s.ht * Math.tan((20 * Math.PI) / 180); return ((s.top + bot) / 2) * s.ht; };
const vR = (set: Record<string, unknown>) => Number(set.datum) / 2;
const VBELT_F: PartFamily<VBeltRow> = {
  id: 'piece.vbelt', name: 'V-belt (narrow wedge)', gloss: 'A narrow wedge V-belt (SPZ, SPA, SPB) by its datum length, laid round two equal pulleys', domains: ['mechanical', 'manufacturing', 'vehicles'], aisle: 'Power transmission / Belts and pulleys',
  says: 'A narrow wedge V-belt (ISO 4184: SPZ 9.7 × 8, SPA 12.7 × 10, SPB 16.3 × 13 mm, 40°) by its datum length (the R40 lengths ISO 4184 prefers), laid as a run round two equal pulleys of a datum diameter: two straights and two half turns. Approximated: drawn as a round cord of its trapezoid\'s area, its cords and cover not drawn. Its pulleys: piece.vpulley of its section',
  rows: VBELTS, size: 'SPZ 1000', source: 'ISO 4184 sections and preferred datum lengths, as makers\' tables give them, typical',
  settings: [{ key: 'datum', label: 'Pulley datum diameter (both), mm', type: 'number', default: 100 }],
  cannot: (r, size, set) => (!(Number(set.datum) >= 50) ? `pulleys of 50 mm datum or more (${String(set.datum)})` : loopCannot(r.L, vR(set), size)),
  recipe: (r, size, set) => beltLoop(`${size} V-belt`, r.L, vR(set), vArea(r.sec), 'rubber', RUBBER),
  expect: (r, _s, set) => loopExpect(r.L, vR(set), vArea(r.sec), 'rubber'),
  tests: [{ inputs: {}, outputs: { pieces: 4 } }],
};
// ==== couplings ======================================================================================================
/** Single universal joints (DIN 808 form E, makers' tables of it, recalled, read from no source here: typical): bore d,
 *  outside D, length overall L, mm. */
const UJ: Record<string, [number, number, number]> = { '6': [6, 16, 40], '8': [8, 16, 40], '10': [10, 20, 52], '12': [12, 22, 62], '14': [14, 25, 68], '16': [16, 29, 74], '18': [18, 32, 82], '20': [20, 36, 86], '22': [22, 40, 108], '25': [25, 45, 108], '30': [30, 50, 122], '32': [32, 58, 136], '35': [35, 63, 155], '40': [40, 72, 172] };
const UJ_F: PartFamily<[number, number, number]> = {
  id: 'piece.ujoint', name: 'Universal joint', gloss: 'A single universal joint (DIN 808) by its bore: two forked hubs and the cross between', domains: ['mechanical', 'manufacturing', 'vehicles'], aisle: 'Power transmission / Couplings',
  says: 'A single universal joint (DIN 808, bores 6 to 40 mm; makers\' tables, typical): its two hubs (each 0.4 of its length, bored for its shafts) and the cross block between them (0.2 of its length, D across), stacked along its axis. Approximated: the forks and the cross\'s trunnions drawn as one block, its pins not drawn, so it does not bend yet (a joint that turns about two axes is not made). It offers Ø<d> joint hub A/axis and hub B/axis (each over a shaft: Over a shaft)',
  rows: UJ, size: '12', source: 'DIN 808 as makers\' tables give it (Mädler, Ganter GN 808, recalled), typical',
  recipe: ([d, D, L], size) => { const n = `Ø${size} joint`, hub = (k: string) => made(`${n} hub ${k}`, 'steel-alloy', { tube: [mm(d) / 2, mm(D) / 2, mm(0.4 * L)] }, { color: STEEL });
    return stack(`Ø${size} universal joint`, 1, [{ b: hub('A') }, { b: made(`${n} cross`, 'steel-alloy', { box: [mm(D) / Math.SQRT2, mm(0.2 * L), mm(D) / Math.SQRT2] }, { color: 0x8a8c90 }) }, { b: hub('B') }]); },
  expect: ([, D, L]) => ({ bound: [mm(D), mm(L), mm(D)], tol: 0.01, says: 'its outside by its length overall' }),
  tests: sizeTest(['Ø12 joint hub A/axis', 'Ø12 joint hub B/axis'], 3),
};
/** Oldham and bellows couplings (makers' tables, e.g. Ruland MOC and MBC, recalled, read from no source here: typical):
 *  outside D, length L, the largest bore, mm. */
const OLDHAM: Record<string, [number, number, number]> = { 'D16 L23': [16.5, 23, 6], 'D19 L25': [19, 25, 8], 'D25 L29': [25.4, 29, 10], 'D33 L38': [33.3, 38, 14], 'D41 L48': [41.3, 48, 19], 'D50 L58': [50, 58, 22], 'D57 L66': [57, 66, 25] };
const BELLOWS: Record<string, [number, number, number]> = { 'D15 L23': [15, 23, 6], 'D19 L27': [19, 27, 8], 'D25 L31': [25, 31, 10], 'D32 L38': [32, 38, 14], 'D40 L48': [40, 48, 19], 'D50 L58': [50, 58, 24] };
const OLDHAM_F: PartFamily<[number, number, number]> = {
  id: 'piece.oldham', name: 'Oldham coupling', gloss: 'An Oldham coupling by its outside and length: two aluminium hubs and the acetal disc between', domains: ['mechanical', 'manufacturing'], aisle: 'Power transmission / Couplings',
  says: 'An Oldham coupling (makers\' sizes, typical): two aluminium hubs (0.38 of its length each, bored to its largest bore) and its acetal centre disc (0.24) between them, stacked along its axis. Approximated: the hubs\' tongues and the disc\'s slots not drawn, its clamp screws not drawn. It takes up a shaft\'s offset; it offers <name> hub A/axis and hub B/axis (over a shaft: Over a shaft)',
  rows: OLDHAM, size: 'D25 L29', source: 'makers\' tables of Oldham couplings (Ruland MOC, recalled), typical',
  recipe: ([D, L, d], size) => { const hub = (k: string) => made(`${size} Oldham hub ${k}`, 'al-6061', { tube: [mm(d) / 2, mm(D) / 2, mm(0.38 * L)] }, { color: ALU });
    return stack(`${size} Oldham coupling`, 1, [{ b: hub('A') }, { b: made(`${size} Oldham disc`, 'pom', { tube: [mm(d) / 2, mm(D) / 2, mm(0.24 * L)] }, { color: 0xf2f2f2 }) }, { b: hub('B') }]); },
  expect: ([D, L, d]) => ({ bound: [mm(D), mm(L), mm(D)], mass: ann(mm(D), mm(d)) * mm(L) * (0.76 * rho('al-6061') + 0.24 * rho('pom')), tol: 0.01, massTol: 0.02, says: 'its outside by its length; nominal mass, hubs and disc' }),
  tests: sizeTest(['D25 L29 Oldham disc/axis', 'D25 L29 Oldham hub A/axis', 'D25 L29 Oldham hub B/axis'], 3),
};
/** A bellows' profile turned about y: its convolutions between its two hubs, from its bore's radius out. */
const bellowsPts = (D: number, L: number, ri: number): P2[] => { const n = 4, hz = 0.5 * L, y0 = 0.25 * L, ro = D / 2 - 0.5, rin = Math.max(ri + 0.6, 0.62 * D / 2), pts: P2[] = [[rin, y0]];
  for (let k = 0; k < n; k++) { const y = y0 + (k * hz) / n; pts.push([ro, y + hz / (4 * n)], [ro, y + (3 * hz) / (4 * n)], [rin, y + hz / n]); }
  pts.push([rin - 0.4, y0 + hz], [rin - 0.4, y0]); return pts.map(([a, b]) => [mm(a), mm(b - y0)] as P2); };
const BELLOWS_F: PartFamily<[number, number, number]> = {
  id: 'piece.bellowscoupling', name: 'Bellows coupling', gloss: 'A metal bellows coupling by its outside and length: two hubs and the stainless bellows between', domains: ['mechanical', 'manufacturing'], aisle: 'Power transmission / Couplings',
  says: 'A bellows coupling (makers\' sizes, typical): two aluminium clamp hubs (a quarter of its length each, bored to its largest bore) and its stainless bellows (half its length: four convolutions turned as a profile, typical) stacked along its axis. Approximated: the bellows\' wall drawn 0.4 mm thick as a turned outline, its clamp screws not drawn. Stiff in torsion and soft across: an encoder\'s or a ball screw\'s coupling. It offers <name> hub A/axis and hub B/axis',
  rows: BELLOWS, size: 'D25 L31', source: 'makers\' tables of bellows couplings (Ruland MBC, recalled), typical',
  recipe: ([D, L, d], size) => { const hub = (k: string) => made(`${size} bellows hub ${k}`, 'al-6061', { tube: [mm(d) / 2, mm(D) / 2, mm(0.25 * L)] }, { color: ALU });
    return stack(`${size} bellows coupling`, 1, [{ b: hub('A') }, { b: made(`${size} bellows`, 'stainless-304', { lathe: { pts: bellowsPts(D, L, d / 2), bore: Math.max(mm(d) / 2, mm(Math.max(d / 2 + 0.6, 0.62 * D / 2) - 0.4)) } }, { color: 0xd0d4d8 }) }, { b: hub('B') }]); },
  expect: ([D, L]) => ({ bound: [mm(D), mm(L), mm(D)], tol: 0.02, says: 'its outside by its length' }),
  tests: [{ inputs: {}, outputs: { pieces: 3 } }],
};
// ==== linear shaft supports (SK, SHF) ===================================================================================
/** SK shaft supports (vendors' tables, recalled, read from no source here: typical): shaft d, centre height h, width W,
 *  thickness L, height H, bolt spacing B, bolt hole S, base thickness G, upright width P, mm. */
const SK: Record<string, { d: number; h: number; W: number; L: number; H: number; B: number; S: number; G: number; P: number }> = Object.fromEntries(([
  ['SK8', 8, 20, 42, 14, 32.8, 32, 5.5, 6, 18], ['SK10', 10, 20, 42, 14, 32.8, 32, 5.5, 6, 18], ['SK12', 12, 23, 42, 14, 37.5, 32, 5.5, 6, 20], ['SK13', 13, 23, 42, 14, 37.5, 32, 5.5, 6, 20],
  ['SK16', 16, 27, 48, 16, 44, 38, 5.5, 8, 25], ['SK20', 20, 31, 60, 20, 51, 45, 6.6, 10, 31], ['SK25', 25, 35, 70, 24, 60, 56, 6.6, 12, 38], ['SK30', 30, 42, 84, 28, 70, 64, 9, 12, 44],
  ['SK35', 35, 50, 98, 32, 82, 74, 11, 14, 50], ['SK40', 40, 60, 114, 36, 96, 90, 11, 15, 60],
] as const).map(([k, d, h, W, L, H, B, S, G, P]) => [k, { d, h, W, L, H, B, S, G, P }]));
const SK_F: PartFamily<(typeof SK)[string]> = {
  id: 'piece.sk', name: 'SK shaft support', gloss: 'An SK aluminium shaft support by its shaft: its base with two bolt holes and its upright with the shaft\'s bore', domains: ['mechanical', 'manufacturing'], aisle: 'Linear motion / Shaft supports',
  says: 'An SK shaft support (SK8 to SK40, vendors\' tables, typical): its base (W × G, L thick) with its two bolt holes B apart through it, and its upright (P wide) on it with the shaft\'s bore along z at its centre height h. Approximated: its clamp slot and clamp screw not drawn. A round shaft goes through its bore (Through a line), one at each end of a linear axis; it offers SK<d> upright/bore and SK<d> base/holes (Bolted joint)',
  rows: SK, size: 'SK8', source: 'vendors\' tables of SK shaft supports, recalled, read from no source here: typical',
  recipe: (r, size) => { const base = made(`${size} base`, 'al-6061', { box: [mm(r.W), mm(r.G), mm(r.L)] }, { color: ALU, pattern: { name: 'holes', points: [[mm(-r.B / 2), 0], [mm(r.B / 2), 0]], hole: mm(r.S) / 2 } });
    const up = made(`${size} upright`, 'al-6061', { box: [mm(r.P), mm(r.H - r.G), mm(r.L)] }, { color: ALU, pattern: { name: 'bore', face: '+z', points: [[0, mm(r.h - r.G - (r.H - r.G) / 2)]], hole: mm(r.d) / 2 } });
    return stack(`${size} shaft support`, 1, [{ b: base }, { b: up }]); },
  expect: (r) => ({ bound: [mm(r.W), mm(r.H), mm(r.L)], tol: 0.01, says: 'its width, height and thickness' }),
  tests: sizeTest(['SK8 base/holes', 'SK8 upright/bore'], 2),
};
/** SHF flanged shaft supports (vendors' tables, recalled, typical): shaft d, flange square A and thickness T, bolt square
 *  J and hole N, boss diameter Db, height overall H, mm. */
const SHF: Record<string, { d: number; A: number; T: number; J: number; N: number; Db: number; H: number }> = Object.fromEntries(([
  ['SHF8', 8, 43, 5, 32, 5.5, 20, 24], ['SHF10', 10, 43, 5, 32, 5.5, 20, 24], ['SHF12', 12, 47, 6, 36, 5.5, 23, 28], ['SHF13', 13, 47, 6, 36, 5.5, 23, 28], ['SHF16', 16, 50, 7, 40, 5.5, 27, 30],
  ['SHF20', 20, 60, 8, 48, 6.6, 32, 36], ['SHF25', 25, 70, 9, 56, 6.6, 40, 40], ['SHF30', 30, 80, 10, 64, 9, 46, 44], ['SHF35', 35, 92, 11, 74, 9, 54, 48], ['SHF40', 40, 105, 12, 86, 11, 60, 52],
] as const).map(([k, d, A, T, J, N, Db, H]) => [k, { d, A, T, J, N, Db, H }]));
const SHF_F: PartFamily<(typeof SHF)[string]> = {
  id: 'piece.shf', name: 'Flanged shaft support (SHF)', gloss: 'An SHF flanged shaft support by its shaft: a square flange with four holes and its boss with the shaft\'s bore', domains: ['mechanical', 'manufacturing'], aisle: 'Linear motion / Shaft supports',
  says: 'An SHF flanged shaft support (SHF8 to SHF40, vendors\' tables, typical): its square flange (A × A, T thick) with four bolt holes on a J square, and its boss standing on it, the shaft\'s bore down its axis (y). Approximated: its clamp slot and screw not drawn. A shaft end goes into its bore (Through a line), standing a shaft up from a plate; it offers SHF<d> flange/holes (Bolted down to a plate) and SHF<d> boss/axis',
  rows: SHF, size: 'SHF10', source: 'vendors\' tables of SHF shaft supports, recalled, read from no source here: typical',
  recipe: (r, size) => stack(`${size} shaft support`, 1, [{ b: made(`${size} flange`, 'al-6061', { box: [mm(r.A), mm(r.T), mm(r.A)] }, { color: ALU, patterns: [{ name: 'holes', points: [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [mm((a! * r.J) / 2), mm((b! * r.J) / 2)] as P2), hole: mm(r.N) / 2 }, { name: 'bore', points: [[0, 0]], hole: mm(r.d) / 2 }] }) },
    { b: made(`${size} boss`, 'al-6061', { tube: [mm(r.d) / 2, mm(r.Db) / 2, mm(r.H - r.T)] }, { color: ALU }) }]),
  expect: (r) => ({ bound: [mm(r.A), mm(r.H), mm(r.A)], tol: 0.01, says: 'its flange\'s square by its height' }),
  tests: sizeTest(['SHF10 boss/axis', 'SHF10 flange/bore', 'SHF10 flange/holes'], 2),
};
// ==== ball screws and their end supports ================================================================================
/** SFU ball screws and their flanged single nuts (TBI Motion's SFU tables, recalled, read from no source here: typical):
 *  screw d, lead, nut body D, flange A and its thickness T, nut length L, bolt circle W, hole X, mm. */
const SFU: Record<string, { d: number; lead: number; D: number; A: number; T: number; L: number; W: number; X: number }> = Object.fromEntries(([
  ['SFU1204', 12, 4, 24, 40, 10, 40, 32, 4.5], ['SFU1605', 16, 5, 28, 48, 10, 50, 38, 5.5], ['SFU1610', 16, 10, 28, 48, 10, 57, 38, 5.5], ['SFU2005', 20, 5, 36, 58, 10, 51, 47, 6.6],
  ['SFU2010', 20, 10, 36, 58, 10, 85, 47, 6.6], ['SFU2505', 25, 5, 40, 62, 10, 51, 51, 6.6], ['SFU2510', 25, 10, 40, 62, 12, 85, 51, 6.6],
] as const).map(([k, d, lead, D, A, T, L, W, X]) => [k, { d, lead, D, A, T, L, W, X }]));
const SFU_F: PartFamily<(typeof SFU)[string]> = {
  id: 'piece.ballscrew', name: 'Ball screw with nut (SFU)', gloss: 'An SFU rolled ball screw by its size and length, its flanged single nut on it', domains: ['mechanical', 'manufacturing'], aisle: 'Linear motion / Ball screws',
  says: 'An SFU ball screw (SFU1204 to SFU2510: diameter and lead; TBI Motion\'s tables, typical) so long, its flanged single nut slid over it at its middle: the nut turned as its flange (A × T, six holes on its W circle) and its body (D, L long), bored to the screw. Approximated: the thread and the balls not drawn (threads are never drawn), the nut\'s flats and wiper not drawn. Its ends are machined to go into its supports (piece.screwsupport: BK at the motor\'s end, BF at the other). It offers <size> screw/axis and <size> nut/holes',
  rows: SFU, size: 'SFU1605', source: 'TBI Motion SFU ball screw nut tables, recalled, read from no source here: typical',
  settings: [{ key: 'length', label: 'Screw length, mm', type: 'number', default: 300 }],
  cannot: (r, size, set) => (len(set) > mm(r.L) ? null : `an ${size} nut is ${r.L} mm long: the screw longer than that`),
  recipe: (r, size, set) => { const nut = made(`${size} nut`, 'steel-alloy', { lathe: { pts: ([[r.d / 2, 0], [r.A / 2, 0], [r.A / 2, r.T], [r.D / 2, r.T], [r.D / 2, r.L], [r.d / 2, r.L]] as P2[]).map(([a, b]) => [mm(a), mm(b)] as P2), bore: mm(r.d) / 2 } }, { color: 0x8a8c90, pattern: { name: 'holes', face: '-y', circle: { n: 6, r: mm(r.W) / 2, phase: Math.PI / 6 }, hole: mm(r.X) / 2, depth: mm(r.T) } });
    return over(made(`${size} screw`, 'steel-alloy', { cyl: [mm(r.d) / 2, len(set)] }, { color: STEEL }), `${size} screw/axis`, nut, 'mid', 'touch'); },
  expect: (r, _s, set) => ({ bound: [mm(r.A), len(set), mm(r.A)], tol: 0.01, says: 'its nut\'s flange across by its screw\'s length' }),
  tests: sizeTest(['SFU1605 nut/axis', 'SFU1605 nut/holes', 'SFU1605 screw/axis'], 2),
};
/** BK (fixed: a pair of angular contact bearings) and BF (floating: one deep-groove bearing) end supports (vendors'
 *  tables, recalled, typical): the screw's end d, its bearings' outside Db and width Bb and how many, the block's width
 *  W, height H, thickness L, centre height h, bolt spacing B and hole X, mm. */
const SUPPORTS: Record<string, { d: number; Db: number; Bb: number; n: number; W: number; H: number; L: number; h: number; B: number; X: number }> = Object.fromEntries(([
  ['BK10', 10, 26, 8, 2, 60, 39, 25, 22, 46, 6.6], ['BK12', 12, 28, 8, 2, 60, 43, 25, 25, 46, 6.6], ['BK15', 15, 32, 9, 2, 70, 48, 27, 28, 54, 6.6], ['BK17', 17, 40, 12, 2, 86, 64, 35, 39, 68, 9], ['BK20', 20, 47, 14, 2, 88, 60, 35, 34, 70, 9],
  ['BF10', 8, 22, 7, 1, 60, 39, 20, 22, 46, 6.6], ['BF12', 10, 26, 8, 1, 60, 43, 20, 25, 46, 6.6], ['BF15', 15, 32, 9, 1, 70, 48, 20, 28, 54, 6.6], ['BF17', 17, 40, 12, 1, 86, 64, 23, 39, 68, 9], ['BF20', 20, 47, 14, 1, 88, 60, 26, 34, 70, 9],
] as const).map(([k, d, Db, Bb, n, W, H, L, h, B, X]) => [k, { d, Db, Bb, n, W, H, L, h, B, X }]));
const SUPPORT_F: PartFamily<(typeof SUPPORTS)[string]> = {
  id: 'piece.screwsupport', name: 'Ball screw end support (BK, BF)', gloss: 'A BK fixed or BF floating ball screw end support by its size: its block and its bearings in its bore', domains: ['mechanical', 'manufacturing'], aisle: 'Linear motion / Ball screws',
  says: 'A ball screw end support (BK10 to BK20 fixed, BF10 to BF20 floating; vendors\' tables, typical): its block (W × H × L) with its bore along z at its centre height h and its two bolt holes B apart down through it, its bearings (a pair, back to back, in a BK; one in a BF; each its rings and ball row, approximated as piece.angularbearing draws them) passed into its bore. Approximated: the lock nut, the seals and the cover not drawn. The screw\'s machined end goes through its bearings (Through a line)',
  rows: SUPPORTS, size: 'BK12', source: 'vendors\' tables of BK and BF ball screw supports, recalled, read from no source here: typical',
  recipe: (r, size) => { const block = made(`${size} block`, 'steel-low', { box: [mm(r.W), mm(r.H), mm(r.L)] }, { color: 0x2a2b2e, patterns: [{ name: 'bore', face: '+z', points: [[0, mm(r.h - r.H / 2)]], hole: mm(r.Db) / 2 }, { name: 'holes', points: [[mm(-r.B / 2), 0], [mm(r.B / 2), 0]], hole: mm(r.X) / 2 }] });
    const one = (k: string) => rolling(`${size} bearing ${k}`, r.d, r.Db, r.Bb, 0.6, 0.6 * (r.Db - r.d) / 2, 'balls');
    const set = r.n === 2 ? stack(`${size} bearings`, 1, [{ b: one('A') }, { b: one('B') }]) : one('A');
    return through(block, set, { port: `${size} block/bore`, from: 'lo' }, 'touch'); },
  expect: (r) => ({ bound: [mm(r.W), mm(r.H), mm(r.L)], tol: 0.01, says: 'its block' }),
  tests: [{ inputs: {}, outputs: { pieces: 7 } }],
};

/** Every family of the drive trade, as the nodes it registers. */
export const DRIVE_FAMILIES = [ANGULAR_F, THRUST_F, HK_F, NK_F, TAPER_F, NU_F, SELFALIGN_F, FLANGED_F, SLEEVE_F, FLANGEBUSH_F, BEVEL_F, WORM_F, WHEEL_F, RACK_F, RING_F, HTD_F, T_F, TBELT_F, CHAIN_F, SPROCKET_F, VPULLEY_F, VBELT_F, UJ_F, OLDHAM_F, BELLOWS_F, SK_F, SHF_F, SFU_F, SUPPORT_F] as PartFamily<unknown>[];
export const DRIVE_NODES: BlockDef[] = DRIVE_FAMILIES.map((f) => familyNode(f));
