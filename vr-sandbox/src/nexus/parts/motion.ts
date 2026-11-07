// Motion and drive, the table-driven families (decision 0026, step 2): extrusion (T-slot and V-slot) as sections along
// their length with their bores and slots, corner brackets, round shafts, lead screws and their nuts, shaft couplers and
// collars, linear ball bushings, miniature rails and carriages, pillow blocks, a GT2 belt laid as a closed run, wheels,
// castors, small DC motors and gear motors, hobby servos. Each is rows from a table and one recipe of the room
// operations (src/nexus/room.ts): no place is written here.
//
// Where the rows come from (each family's `source` and its rows say which):
// - V-slot profiles: the outline of OpenBuilds' V-slot as bd_warehouse draws it (open_builds.py, VSlotLinearRailProfile,
//   _VSlotGroove, _VSlotInternalCavity: the groove's and the cavities' points, the 2.3 mm bores, the 1.5 mm corners, the
//   grooves' places and angles for 20x20, 20x40, 20x60, 20x80 and 40x40), copied as figures, read 2026-11-05 as text, never
//   run, with its notice:
//
//       Copyright 2024 Gumyr
//
//       Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance
//       with the License. You may obtain a copy of the License at
//
//           http://www.apache.org/licenses/LICENSE-2.0
//
//       Unless required by applicable law or agreed to in writing, software distributed under the License is distributed
//       on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for
//       the specific language governing permissions and limitations under the License.
//
//   The same file gives the flexible coupler's 20 mm outside and 25 mm length (FlexibleCoupler), used for the rigid
//   couplers to 8 mm bores below.
// - LMxUU linear ball bushings: BOSL2's lmXuu_info table (linear_bearings.scad, read 2026-11-05 as text), copied with its
//   notice:
//
//       BSD 2-Clause License
//
//       Copyright (c) 2017-2019, Revar Desmera
//       All rights reserved.
//
//       Redistribution and use in source and binary forms, with or without modification, are permitted provided that
//       the following conditions are met:
//
//       * Redistributions of source code must retain the above copyright notice, this list of conditions and the
//         following disclaimer.
//
//       * Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the
//         following disclaimer in the documentation and/or other materials provided with the distribution.
//
//       THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED
//       WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
//       PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY
//       DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
//       PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
//       CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
//       OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
// - T-slot 2020: Misumi's HFS5-2020 page (catalogue p. 2-511: the 6 mm slot, the Ø4.2 bore, the R1 corners, 183 mm²,
//   0.5 kg/m), re-keyed; the other T-slot series' slots and every slot's inner shape typical (labelled so), their masses
//   a metre the families' own typical figures (families.ts EXTRUSIONS).
// - MGN rails and carriages: HIWIN's MG catalogue as families.ts holds it (MGN). Pillow blocks' centre heights and lengths,
//   collars (DIN 705) and gear motors: src/nexus/kinds/motion.ts. DC motors' cans and hobby servos: families.ts (DCM,
//   SERVOS) and the vendor figures below, labelled typical. The rest typical, each table says so.
// (Figures are mm in the tables and m in the solids.)

import { made, over, stack, through, turn, run, onto, fitGap, type Block, type RunSeg } from '../room';
import { bracket, METRIC } from '../common';
import { densityKg } from '../mass';
import { TAP_DRILL } from '../interfaces';
import { DCM, EXTRUSIONS, MGN, SERVOS } from '../families';
import { COLLAR, GM, UCP } from '../kinds/motion';
import { NEMA_BOSL2 } from './bosl2';
import { build, type PartFamily } from './maker';

const mm = (x: number): number => x / 1000;
const rho = (mat: string): number => { const d = densityKg(mat); if (d === undefined) throw new Error(`no density for ${mat}`); return d; };
const len = (set: Record<string, unknown>, k = 'length') => Number(set[k]) / 1000;
const disc = (d: number) => (Math.PI * d * d) / 4;
const lengthSet = (d: number, label = 'Length, mm') => ({ key: 'length', label, type: 'number' as const, default: d });
const needLength = (_r: unknown, _s: string, set: Record<string, unknown>) => (len(set) > 0 ? null : `a length above 0 (${String(set.length)} mm)`);
const tap = (size: string) => { const t = TAP_DRILL[size]; if (!t) throw new Error(`no ISO 2306 tap drill for ${size}`); return t.drill; };

// ---- extrusion: a profile as one outline, its holes joined to its outside where they come nearest ---------------------
type P2 = [number, number];
const rot = (p: P2, deg: number): P2 => { const q = ((((deg / 90) % 4) + 4) % 4), c = [1, 0, -1, 0][q]!, s = [0, 1, 0, -1][q]!; return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; };
const areaOf = (pts: readonly P2[]) => pts.reduce((t, q, i) => { const w = pts[(i + 1) % pts.length]!; return t + q[0] * w[1] - w[0] * q[1]; }, 0) / 2;
const loopOf = (c: P2, r: number, n = 24): P2[] => Array.from({ length: n }, (_, k) => [c[0] + r * Math.cos((2 * Math.PI * k) / n), c[1] + r * Math.sin((2 * Math.PI * k) / n)] as P2);
/** A profile: its outside W × H (mm) with rounded corners, the grooves cut into its faces (each at a cell's middle, turned
 *  by 0, 90, 180 or 270° to face +x, +y, −x or −y; the groove's own points with the face at x = h, in order across it),
 *  and its holes (bores, cavities). */
interface Profile { W: number; H: number; corner: number; groove: P2[]; grooves: { c: P2; a: number }[]; holes: P2[][] }
/** The profile as one closed outline (m), read by even-odd: its outside walked round with its grooves, and each hole
 *  joined to the outside's nearest point by a cut of no width there and back (as common.ts joins a gear's bore). */
function outlineOf(p: Profile): P2[] {
  const hw = p.W / 2, hh = p.H / 2, rc = p.corner;
  const face = (a: number) => p.grooves.filter((g) => g.a === a).sort((u, v) => (a === 0 ? u.c[1] - v.c[1] : a === 90 ? v.c[0] - u.c[0] : a === 180 ? v.c[1] - u.c[1] : u.c[0] - v.c[0]));
  const notch = (g: { c: P2; a: number }) => p.groove.map((q) => { const r = rot(q, g.a); return [g.c[0] + r[0], g.c[1] + r[1]] as P2; });
  const arc = (cx: number, cy: number, a0: number): P2[] => (rc > 0 ? [0, 1, 2, 3].map((k) => { const a = ((a0 + 30 * k) * Math.PI) / 180; return [cx + rc * Math.cos(a), cy + rc * Math.sin(a)] as P2; }) : [[cx, cy]]);
  const outer: P2[] = [...face(0).flatMap(notch), ...arc(hw - rc, hh - rc, 0), ...face(90).flatMap(notch), ...arc(-hw + rc, hh - rc, 90), ...face(180).flatMap(notch), ...arc(-hw + rc, -hh + rc, 180), ...face(270).flatMap(notch), ...arc(hw - rc, -hh + rc, 270)];
  const at = new Map<number, P2[][]>();
  for (const h0 of p.holes) { const h = areaOf(h0) > 0 ? [...h0].reverse() : h0; let bi = 0, bj = 0, bd = Infinity;
    outer.forEach((o, i) => h.forEach((q, j) => { const d = Math.hypot(o[0] - q[0], o[1] - q[1]); if (d < bd) { bd = d; bi = i; bj = j; } }));
    const list = at.get(bi) ?? []; list.push([...h.slice(bj), ...h.slice(0, bj), h[bj]!]); at.set(bi, list); }
  const out: P2[] = []; outer.forEach((o, i) => { out.push(o); for (const l of at.get(i) ?? []) out.push(...l, o); });
  return out.map(([x, y]) => [mm(x), mm(y)] as P2);
}
// (V-slot, bd_warehouse open_builds.py: the groove from its bottom to its mouth, mirrored; the cavity between two cells of
// a 20xN; the cross-shaped cavity of 40x40; bores 2.3 mm; corners 1.5 mm. The groove's points in order across its face)
const VG_HALF: P2[] = [[3.69, 0], [3.9, 0.21], [3.9, 2.8393398282202034], [6.560660171779773, 5.5], [8.2, 5.5], [8.2, 3.125], [8.545, 3.125], [10, 4.58]];
const V_GROOVE: P2[] = [...[...VG_HALF].reverse().map(([x, y]) => [x, -y] as P2).slice(0, -1), ...VG_HALF];
const V_CAVITY: P2[] = [[0, -6.1], [2.83933983, -6.1], [6.23933983, -2.7], [8.2, -2.7], [8.2, 2.7], [6.23933983, 2.7], [2.83933983, 6.1], [-2.83933983, 6.1], [-6.23933983, 2.7], [-8.2, 2.7], [-8.2, -2.7], [-6.23933983, -2.7], [-2.83933983, -6.1]];
const V_CROSS_ARM: P2[] = [[18.2, 2.7], [16.239339828219503, 2.7], [12.839339828219602, 6.1], [7.1606601717797975, 6.1], [6.1, 7.160660171780418], [6.1, 12.839339828220236], [2.7, 16.23933982822021], [2.7, 18.2]];
const V_CROSS: P2[] = [0, 90, 180, 270].flatMap((a) => V_CROSS_ARM.map((q) => rot(q, a)));
const V_GROOVES: Record<string, [P2, number][]> = {
  '20x20': [[[0, 0], 0], [[0, 0], 90], [[0, 0], 180], [[0, 0], 270]],
  '20x40': [[[0, 10], 0], [[0, 10], 90], [[0, 10], 180], [[0, -10], 180], [[0, -10], 270], [[0, -10], 0]],
  '20x60': [[[0, 0], 0], [[0, 20], 0], [[0, 20], 90], [[0, 20], 180], [[0, 0], 180], [[0, -20], 180], [[0, -20], 270], [[0, -20], 0]],
  '20x80': [[[0, 10], 0], [[0, 30], 0], [[0, 30], 90], [[0, 30], 180], [[0, 10], 180], [[0, -10], 180], [[0, -30], 180], [[0, -30], 270], [[0, -30], 0], [[0, -10], 0]],
  '40x40': [[[10, 10], 0], [[10, 10], 90], [[-10, 10], 90], [[-10, 10], 180], [[-10, -10], 180], [[-10, -10], 270], [[10, -10], 270], [[10, -10], 0]],
};
const cellsOf = (W: number, H: number, pitch: number): P2[] => { const nx = Math.round(W / pitch), ny = Math.round(H / pitch), out: P2[] = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) out.push([(i - (nx - 1) / 2) * pitch, (j - (ny - 1) / 2) * pitch]); return out; };
function vslot(size: string): Profile {
  const [W, H] = size.split('x').map(Number) as [number, number], holes: P2[][] = cellsOf(W, H, 20).map((c) => loopOf(c, 2.3));
  if (W === 20 && H > 20) for (let i = 0; i < H / 20 - 1; i++) { const y = (i - (H / 20 - 2) / 2) * 20; holes.push(V_CAVITY.map(([x, v]) => [x, v + y] as P2)); }
  if (W === 40) holes.push(V_CROSS);
  return { W, H, corner: 1.5, groove: V_GROOVE, grooves: V_GROOVES[size]!.map(([c, a]) => ({ c, a })), holes };
}
/** T-slot series (typical, but the 2020's slot and bore, Misumi HFS5): h half its cell, a the slot's opening, t its lip, bw
 *  the half-width of the slot's cavity behind the lip, k the core's half-size the cavity's floor stands on, d the half-web
 *  between neighbouring cavities (along the diagonal), r the bore. */
const T_SERIES: Record<string, { h: number; a: number; t: number; bw: number; k: number; d: number; r: number; corner: number; cornerHoles?: [number, number] }> = {
  '5': { h: 10, a: 6, t: 1.8, bw: 5.5, k: 3.8, d: 1.06, r: 2.1, corner: 1 },
  '6': { h: 15, a: 8, t: 2.2, bw: 8, k: 5.5, d: 1.4, r: 3.4, corner: 1.5 },
  // (a 40 cell's corners hollowed, a hole at (±15, ±15) of 4 mm radius each, typical of the series' corner cavities)
  '8': { h: 20, a: 8, t: 4.3, bw: 10, k: 7, d: 1.8, r: 3.4, corner: 2, cornerHoles: [15, 4] },
};
function tslot(series: string, n: number): Profile {
  const { h, a, t, bw, k, d, r, corner, cornerHoles } = T_SERIES[series]!, W = 2 * h, H = 2 * h * n;
  const groove: P2[] = [[h, -a / 2], [h - t, -a / 2], [h - t, -bw], [bw + d, -bw], [k, -(k - d)], [k, k - d], [bw + d, bw], [h - t, bw], [h - t, a / 2], [h, a / 2]];
  const cells = Array.from({ length: n }, (_, i) => [0, -H / 2 + h + 2 * h * i] as P2), grooves: { c: P2; a: number }[] = [], holes: P2[][] = cells.map((c) => loopOf(c, r));
  cells.forEach((c, i) => { grooves.push({ c, a: 0 }, { c, a: 180 }); if (i === n - 1) grooves.push({ c, a: 90 }); if (i === 0) grooves.push({ c, a: 270 });
    if (cornerHoles) for (const [sx, sy] of [[1, 1], [-1, 1], [-1, -1], [1, -1]] as const) holes.push(loopOf([c[0] + sx * cornerHoles[0], c[1] + sy * cornerHoles[0]], cornerHoles[1])); });
  // (between two cells, the cavity of their two facing slots, closed: no lip, no opening)
  for (let i = 0; i + 1 < n; i++) { const y = cells[i]![1] + h; holes.push(([[k - d, -h + k], [bw, -h + bw + d], [bw, h - bw - d], [k - d, h - k], [-(k - d), h - k], [-bw, h - bw - d], [-bw, -h + bw + d], [-(k - d), -h + k]] as P2[]).map(([x, v]) => [x, v + y] as P2)); }
  return { W, H, corner, groove, grooves, holes };
}
type ExtRow = { kind: 'T' | 'V'; W: number; H: number; profile: () => Profile; kgm?: number; src: string };
const MISUMI = 'Misumi HFS5-2020 (catalogue p. 2-511): 6 mm slot, Ø4.2 bore, 183 mm², 0.5 kg/m';
const EXT_ROWS: Record<string, ExtRow> = {
  '2020 T-slot': { kind: 'T', W: 20, H: 20, profile: () => tslot('5', 1), kgm: 183e-6 * 2700, src: MISUMI },
  '2040 T-slot': { kind: 'T', W: 20, H: 40, profile: () => tslot('5', 2), kgm: EXTRUSIONS['2040']!.kgm, src: 'series 5 slot (typical); 0.8 kg/m, families.ts (typical)' },
  '3030 T-slot': { kind: 'T', W: 30, H: 30, profile: () => tslot('6', 1), kgm: EXTRUSIONS['3030']!.kgm, src: 'series 6 slot (typical); 0.9 kg/m, families.ts (typical)' },
  '3060 T-slot': { kind: 'T', W: 30, H: 60, profile: () => tslot('6', 2), src: 'series 6 slot (typical)' },
  '4040 T-slot': { kind: 'T', W: 40, H: 40, profile: () => tslot('8', 1), kgm: EXTRUSIONS['4040']!.kgm, src: 'series 8 slot (typical); 1.5 kg/m, families.ts (typical)' },
  '4080 T-slot': { kind: 'T', W: 40, H: 80, profile: () => tslot('8', 2), src: 'series 8 slot (typical)' },
  ...Object.fromEntries(['20x20', '20x40', '20x60', '20x80', '40x40'].map((s) => { const [W, H] = s.split('x').map(Number) as [number, number]; return [`${W}${H} V-slot`, { kind: 'V' as const, W, H, profile: () => vslot(s), src: 'OpenBuilds V-slot as bd_warehouse draws it (open_builds.py, Apache-2.0)' }]; })),
};
const EXTRUSION: PartFamily<ExtRow> = {
  id: 'piece.extrusion', name: 'Aluminium extrusion', gloss: 'A T-slot or V-slot aluminium extrusion by its profile and length: its section along z, with its bores and slots', domains: ['mechanical', 'structural', 'manufacturing'],
  says: 'An aluminium extrusion (6063) by its profile (2020 to 4080 T-slot, 2020 to 4040 V-slot) and length: its section drawn along z with its slots, bores and cavities. It offers <size> extrusion/axis, a line along its length through its middle, <size> extrusion/ends, a line along it through each bore (a screw into an end cuts its own thread\'s room), and <size> extrusion/slots, a line along each slot (where a T-nut slides; T-nuts not made yet). It lies along z, its slots up: what stands on it goes on its +y face (Stack, Bolted joint)',
  rows: EXT_ROWS, size: '2020 T-slot', source: 'Misumi HFS5 (2020 T-slot), OpenBuilds V-slot as bd_warehouse draws it (Apache-2.0), other T-slot series typical',
  settings: [lengthSet(300)], cannot: needLength,
  recipe: (r, size, set) => { const P = r.profile(), cells = cellsOf(r.W, r.H, r.kind === 'V' ? 20 : r.W);
    // (each slot's line along the length, through the middle of its groove: where a T-nut slides)
    const gx = P.groove.map((q) => q[0]), mid = (Math.min(...gx) + Math.max(...gx)) / 2, slots = P.grooves.map((g) => { const q = rot([mid, 0], g.a); return [mm(g.c[0] + q[0]), mm(g.c[1] + q[1])] as [number, number]; });
    return made(`${size} extrusion`, 'al-6063', { section: { pts: outlineOf(P), L: len(set) } }, { color: 0xc8ccd0, patterns: [{ name: 'ends', face: '+z', points: cells.map(([x, y]) => [mm(x), mm(y)] as [number, number]) }, { name: 'slots', face: '+z', points: slots }] }); },
  expect: (r, _s, set) => ({ bound: [mm(r.W), mm(r.H), len(set)], ...(r.kgm !== undefined ? { mass: r.kgm * len(set) } : {}), tol: 0.01, massTol: r.src === MISUMI ? 0.05 : 0.2, says: `its profile by its length${r.kgm !== undefined ? `; ${r.kgm.toFixed(2)} kg a metre (${r.src}${r.src === MISUMI ? '' : '; the slot\'s inner shape typical, so within 20 %'})` : ''}` }),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['2020 T-slot extrusion/axis', '2020 T-slot extrusion/ends', '2020 T-slot extrusion/slots'] } }, { set: { size: '4040 V-slot', length: 100 }, inputs: {}, outputs: { pieces: 1 } }],
};
// ---- corner brackets for extrusion (typical: cast aluminium, one hole a leg) ------------------------------------------
type CornerRow = { a: number; t: number; L: number; bolt: string };
const CORNERS: Record<string, CornerRow> = { '2020': { a: 20, t: 3, L: 20, bolt: 'M5' }, '3030': { a: 30, t: 4, L: 30, bolt: 'M6' }, '4040': { a: 40, t: 5, L: 40, bolt: 'M8' } };
const CORNER: PartFamily<CornerRow> = {
  id: 'piece.cornerbracket', name: 'Extrusion corner bracket', gloss: 'A corner bracket for 2020, 3030 or 4040 extrusion: an L of two legs, a hole in each', domains: ['mechanical', 'structural'],
  says: 'A corner bracket for extrusion (2020, 3030, 4040; cast aluminium, its sizes typical, its gusset not drawn): an L bracket of two legs, one clearance hole in each (ISO 273 medium) for its bolt (M5, M6, M8). It offers <size> corner bracket foot/holes (along y) and upright/holes (across): bolted down onto an extrusion\'s top (Stack, Bolted joint) or to a wall plate',
  rows: CORNERS, size: '2020', source: 'typical sizes of extrusion corner brackets (cast aluminium), holes ISO 273',
  recipe: (r, size) => bracket(`${size} corner bracket`, mm(r.a), mm(r.t), mm(r.L), r.bolt, 1, 'al-a380', 1),
  expect: (r) => { const c = mm(METRIC[r.bolt]!.clear!); return { bound: [mm(r.a), mm(r.a), mm(r.L)], mass: ((mm(r.a) + mm(r.a - r.t)) * mm(r.t) * mm(r.L) - 2 * disc(c) * mm(r.t)) * rho('al-a380'), tol: 0.01, massTol: 0.03, says: 'its legs by its width; nominal mass, two plates less their holes' }; },
  tests: [{ inputs: {}, outputs: { pieces: 2, offers: ['2020 corner bracket foot/holes', '2020 corner bracket upright/holes'] } }],
};
// ---- round shafts (h6) and lead screws --------------------------------------------------------------------------------
const SHAFTS: Record<string, number> = Object.fromEntries([3, 4, 5, 6, 8, 10, 12, 15, 16, 20, 25].map((d) => [String(d), d]));
const SHAFT: PartFamily<number> = {
  id: 'piece.shaft', name: 'Round shaft', gloss: 'A ground round shaft (h6), 3 to 25 mm, by its diameter and length', domains: ['mechanical', 'manufacturing'],
  says: 'A ground steel shaft (its diameter to h6; the sizes linear shafts are sold in, typical) by its diameter and length: a rod along y. It offers Ø<size> shaft/axis: a bearing, a bushing, a collar, a wheel or a coupler slides over it (Over a shaft), or it passes through a bore (Through a line). D-cut shafts are drawn round (their flat not drawn)',
  rows: SHAFTS, size: '8', source: 'the diameters ground linear shafts are sold in (typical), tolerance h6 (ISO 286-2)',
  settings: [lengthSet(200)], cannot: needLength, mat: 'steel-alloy',
  recipe: (d, size, set) => made(`Ø${size} shaft`, String(set.mat ?? 'steel-alloy'), { cyl: [mm(d) / 2, len(set)] }, String(set.mat ?? 'steel-alloy') === 'steel-alloy' ? { color: 0xb8bcc2 } : {}),
  expect: (d, _s, set) => ({ bound: [mm(d), len(set), mm(d)], mass: disc(mm(d)) * len(set) * rho(String(set.mat ?? 'steel-alloy')), tol: 0.01, massTol: 0.02, says: 'its diameter by its length; nominal mass, the rod' }),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['Ø8 shaft/axis'] } }],
};
type LeadRow = { d: number; P: number; lead: number };
const LEADS: Record<string, LeadRow> = { 'T8 lead 2': { d: 8, P: 2, lead: 2 }, 'T8 lead 8': { d: 8, P: 2, lead: 8 }, 'T10 lead 2': { d: 10, P: 2, lead: 2 }, 'T12 lead 3': { d: 12, P: 3, lead: 3 } };
const LEADSCREW: PartFamily<LeadRow> = {
  id: 'piece.leadscrew', name: 'Lead screw', gloss: 'A trapezoidal lead screw (T8 and up) by its size, lead and length', domains: ['mechanical', 'manufacturing'],
  says: 'A trapezoidal lead screw (ISO 2904 Tr profile; T8 × 2 with lead 2 or 8 (four starts), T10, T12; stainless) by its length: drawn as a rod of its outside diameter (its thread not drawn: approximated). It offers <size> lead screw/axis: its nut slides over it (Over a shaft, a touch fit), a coupler over its end',
  rows: LEADS, size: 'T8 lead 8', source: 'ISO 2904 Tr sizes; leads (pitch × starts) as sold for 3D printers (typical)',
  settings: [lengthSet(300)], cannot: needLength,
  recipe: (r, size, set) => made(`${size} lead screw`, 'stainless-304', { cyl: [mm(r.d) / 2, len(set)] }, { color: 0xb8bcc2 }),
  expect: (r, _s, set) => ({ bound: [mm(r.d), len(set), mm(r.d)], mass: disc(mm(r.d)) * len(set) * rho('stainless-304'), tol: 0.01, massTol: 0.02, says: 'its outside by its length; nominal mass, a rod of its outside (the thread\'s grooves not taken out)' }),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['T8 lead 8 lead screw/axis'] } }],
};
type NutRow = { d: number; D: number; F: number; b: number; L: number; hole: number; pcd: number };
const LEADNUTS: Record<string, NutRow> = { T8: { d: 8, D: 22, F: 3.5, b: 10.2, L: 15, hole: 3.5, pcd: 16 } };
const LEADNUT: PartFamily<NutRow> = {
  id: 'piece.leadnut', name: 'Lead screw nut', gloss: 'A brass flanged nut for a T8 lead screw: its flange with four screw holes and its body', domains: ['mechanical', 'manufacturing'],
  says: 'A brass flanged nut for a lead screw (T8: flange Ø22 × 3.5 with four Ø3.5 holes on Ø16, body Ø10.2, 15 long; typical of the nuts sold): one turned piece, its bore the screw\'s outside (its thread not drawn), tapped: it goes on the screw by its thread whatever fit is asked (Over a shaft). It offers <size> lead nut/holes, for screws into what it drives',
  rows: LEADNUTS, size: 'T8', source: 'the T8 brass flange nut as sold for 3D printers (typical)',
  recipe: (r, size) => made(`${size} lead nut`, 'brass', { lathe: { pts: [[0, 0], [mm(r.D) / 2, 0], [mm(r.D) / 2, mm(r.F)], [mm(r.b) / 2, mm(r.F)], [mm(r.b) / 2, mm(r.L)], [0, mm(r.L)]], bore: mm(r.d) / 2 } }, { tapped: true, pattern: { name: 'holes', face: '-y', circle: { n: 4, r: mm(r.pcd) / 2, phase: Math.PI / 4 }, hole: mm(r.hole) / 2, depth: mm(r.F) } }),
  expect: (r) => ({ bound: [mm(r.D), mm(r.L), mm(r.D)], mass: ((disc(mm(r.D)) - disc(mm(r.d))) * mm(r.F) + (disc(mm(r.b)) - disc(mm(r.d))) * mm(r.L - r.F) - 4 * disc(mm(r.hole)) * mm(r.F)) * rho('brass'), tol: 0.01, massTol: 0.03, says: 'its flange by its length; nominal mass, flange and body less bore and holes' }),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['T8 lead nut/axis', 'T8 lead nut/holes'] } }],
};
// ---- couplers and collars -------------------------------------------------------------------------------------------
type CouplerRow = { kind: 'rigid' | 'jaw'; d1: number; d2: number; D: number; L: number };
const rigid = (d1: number, d2: number): CouplerRow => { const big = Math.max(d1, d2) > 8; return { kind: 'rigid', d1, d2, D: big ? 25 : 20, L: big ? 30 : 25 }; };
const JAWS: Record<string, [number, number]> = { L050: [27.5, 8], L070: [35, 12], L075: [45, 16], L090: [53.5, 20], L100: [65, 25] };
const COUPLERS: Record<string, CouplerRow> = {
  ...Object.fromEntries(([[5, 5], [5, 6.35], [5, 8], [6, 8], [6.35, 8], [8, 8], [8, 10], [10, 10], [10, 12], [12, 12]] as const).map(([a, b]) => [`rigid ${a}×${b}`, rigid(a, b)])),
  ...Object.fromEntries(Object.entries(JAWS).map(([k, [D, d]]) => [`jaw ${k} ${d}`, { kind: 'jaw' as const, d1: d, d2: d, D, L: 1.6 * D }])),
};
const COUPLER: PartFamily<CouplerRow> = {
  id: 'piece.coupler', name: 'Shaft coupler', gloss: 'A shaft coupler: rigid (one aluminium sleeve, two bores) or jaw (two hubs and a spider)', domains: ['mechanical', 'manufacturing'],
  says: 'A shaft coupler by its bores: rigid, one aluminium sleeve with its two bores end to end (20 × 25 mm to 8 mm bores, as bd_warehouse gives OpenBuilds\' coupler; 25 × 30 above, typical), or jaw (L050 to L100: two hubs and an elastomer spider, typical; its jaws not drawn). Its clamp screws not drawn. It offers <name>/axis: it slides over a shaft of its smaller bore (Over a shaft), a motor\'s or a lead screw\'s',
  rows: COUPLERS, size: 'rigid 5×8', source: 'bd_warehouse open_builds.py FlexibleCoupler (20 × 25 mm), jaw sizes from src/nexus/kinds/motion.ts (typical)',
  recipe: (r, size) => { const R = mm(r.D) / 2, L = mm(r.L);
    if (r.kind === 'rigid') return made(`${size} coupler`, 'al-6061', { lathe: { pts: [[mm(r.d1) / 2, 0], [R, 0], [R, L], [mm(r.d2) / 2, L], [mm(r.d2) / 2, L / 2], [mm(r.d1) / 2, L / 2]] } }, { color: 0xc4c8cc });
    const hub = (k: string) => made(`${size} coupler hub ${k}`, 'al-6061', { tube: [mm(r.d1) / 2, R, 0.42 * L] }, { color: 0xc4c8cc });
    return stack(`${size} coupler`, 1, [{ b: hub('A') }, { b: made(`${size} coupler spider`, 'nbr', { tube: [mm(r.d1) / 2, R * 0.85, 0.16 * L] }, { color: 0xd0302a }) }, { b: hub('B') }]); },
  expect: (r) => ({ bound: [mm(r.D), mm(r.L), mm(r.D)], ...(r.kind === 'rigid' ? { mass: (disc(mm(r.D)) * mm(r.L) - (disc(mm(r.d1)) + disc(mm(r.d2))) * mm(r.L) / 2) * rho('al-6061') } : {}), tol: 0.01, massTol: 0.03, says: r.kind === 'rigid' ? 'its outside by its length; nominal mass, the sleeve less its bores' : 'its outside by its length' }),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['rigid 5×8 coupler/axis'] } }, { set: { size: 'jaw L070 12' }, inputs: {}, outputs: { pieces: 3 } }],
};
const setScrewFor = (d: number) => (d < 10 ? 'M3' : d < 20 ? 'M4' : d < 35 ? 'M5' : 'M6');
const COLLARS: Record<string, [number, number, number]> = Object.fromEntries(Object.entries(COLLAR).map(([d, [D, B]]) => [d, [Number(d), D, B]]));
const SHAFTCOLLAR: PartFamily<[number, number, number]> = {
  id: 'piece.collar', name: 'Shaft collar', gloss: 'A set collar (DIN 705) by its bore: a ring with a tapped hole for its set screw', domains: ['mechanical', 'manufacturing'],
  says: 'A set collar (DIN 705, bores 3 to 50 mm): a steel ring, its tapped hole (ISO 2306 drill) running in from its side to the bore, offered as Ø<size> collar/set screw for its set screw (ISO 4026, M3 to M6 by the bore, as the kinds say) to go down (Through a line); it slides over a shaft of its bore (Over a shaft, a touch fit) to locate what is beside it',
  rows: COLLARS, size: '8', source: 'DIN 705 as src/nexus/kinds/motion.ts gives it; tap drills ISO 2306',
  recipe: ([d, D, B], size) => made(`Ø${size} collar`, 'steel-low', { tube: [mm(d) / 2, mm(D) / 2, mm(B)] }, { color: 0x2a2b2e, pattern: { name: 'set screw', face: '+x', points: [[0, 0]], hole: mm(tap(setScrewFor(d))) / 2, depth: mm(D - d) / 2 } }),
  expect: ([d, D, B]) => ({ bound: [mm(D), mm(B), mm(D)], mass: ((disc(mm(D)) - disc(mm(d))) * mm(B) - disc(mm(tap(setScrewFor(d)))) * mm(D - d) / 2) * rho('steel-low'), tol: 0.01, massTol: 0.05, says: 'its outside by its width; nominal mass, the ring less its tapped hole' }),
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['Ø8 collar/axis', 'Ø8 collar/set screw'] } }],
};
// ---- linear ball bushings, LMxUU (BOSL2's table, BSD-2-Clause, above) ------------------------------------------------
/** lmXuu_info: shaft → [outside, length], mm (BOSL2, linear_bearings.scad). */
export const LMUU_BOSL2: Record<number, [number, number]> = { 4: [8, 12], 5: [10, 15], 6: [12, 19], 8: [15, 24], 10: [19, 29], 12: [21, 30], 13: [23, 32], 16: [28, 37], 20: [32, 42], 25: [40, 59], 30: [45, 64], 35: [52, 70], 40: [60, 80], 50: [80, 100], 60: [90, 110], 80: [120, 140], 100: [150, 175] };
const LMS: Record<string, [number, number, number]> = Object.fromEntries(Object.entries(LMUU_BOSL2).map(([d, [D, L]]) => [`LM${d}UU`, [Number(d), D, L]]));
const LMUU: PartFamily<[number, number, number]> = {
  id: 'piece.lmuu', name: 'Linear ball bushing (LMxUU)', gloss: 'A linear ball bushing LMxUU by its shaft: its steel sleeve over its ball cage', domains: ['mechanical', 'manufacturing'],
  says: 'A linear ball bushing (LM4UU to LM100UU, BOSL2\'s table): its steel sleeve slid over its ball cage (the balls drawn as the cage\'s ring, its seals not drawn: approximated), the cage\'s bore the shaft\'s. It offers <size> cage/axis: it slides over a round shaft of its size (Over a shaft, a touch fit) and runs along it; its sleeve goes into a block\'s bore',
  rows: LMS, size: 'LM8UU', source: 'BOSL2 lmXuu_info (linear_bearings.scad, BSD-2-Clause)',
  recipe: ([d, D, L], size) => { const ri = mm(D) / 2 - mm(D - d) / 4;
    return over(made(`${size} cage`, 'pom', { tube: [mm(d) / 2, ri, mm(L)] }, { color: 0x1c1c1c }), `${size} cage/axis`, made(`${size} sleeve`, 'steel-chrome', { tube: [ri, mm(D) / 2, mm(L)] }, { color: 0xb8bcc2 }), 'mid', 'touch'); },
  expect: ([, D, L]) => ({ bound: [mm(D), mm(L), mm(D)], tol: 0.01, says: 'its outside by its length' }),
  tests: [{ inputs: {}, outputs: { pieces: 2, offers: ['LM8UU cage/axis', 'LM8UU sleeve/axis'] } }],
};
// ---- miniature rails and carriages, MGN (HIWIN, families.ts) ----------------------------------------------------------
type MgnRow = { sz: number; t: 'C' | 'H' };
const MGNS: Record<string, MgnRow> = Object.fromEntries(Object.keys(MGN).flatMap((s) => (['C', 'H'] as const).map((t) => [`MGN${s}${t}`, { sz: Number(s), t }])));
const RAIL: PartFamily<MgnRow> = {
  id: 'piece.mgn', name: 'Miniature rail and carriage (MGN)', gloss: 'An MGN miniature linear rail (7, 9, 12, 15) with its short (C) or long (H) carriage on it', domains: ['mechanical', 'manufacturing'],
  says: 'An MGN rail (HIWIN, 7 to 15 mm) by its length, its holes through it at its pitch (their counterbores not drawn: a bolted joint takes holes along +y only, and a counterbore is cut from a face), and its carriage (C or H) at its middle: the block\'s top with its four tapped holes, the block on the rail across the slide fit\'s gap at the rail\'s width (ISO 286, room.ts), so the carriage slides along it (the joint the movement reads), its two skirts hung under it either side of the rail, H1 off the rail\'s foot (HIWIN\'s H1 for its size: the clearance under the carriage). Approximated: the ball grooves, end caps, seals and balls not drawn (the block and its skirts solid steel; the skirts\' sides stand the slide gap off the rail\'s, written as no face). It offers MGN<n> rail/holes (bolt it down onto an extrusion: Bolted joint) and MGN<n><C|H> block/holes (what it carries)',
  rows: MGNS, size: 'MGN12H', source: 'HIWIN MG series catalogue, as families.ts gives it (MGN)',
  settings: [lengthSet(300, 'Rail length, mm')],
  cannot: (m, size, set) => { const b = MGN[m.sz]!.blocks[m.t].L; return len(set) > mm(b + 5) ? null : `an ${size} carriage is ${b} mm long: its rail must be longer, ${Math.ceil(b + 5)} mm or more`; },
  recipe: (m, size, set) => {
    // (root 6: the block on the rail across the slide fit's gap at the rail's width (fitGap, ISO 286's band; before, a 1 mm
    // lift typical, scaled by hand for MGN7, and a 0.25 mm gap by hand), so the carriage is read as sliding on it; its skirts
    // hung under it each side, their feet H1 off the rail's foot, HIWIN's H1 for every size held (none typical), their
    // inner sides the slide gap off the rail's)
    const R = MGN[m.sz]!, blk = R.blocks[m.t], L = len(set), nh = Math.max(1, Math.floor((L * 1000 - 2 * R.E) / R.P) + 1), E1 = (L * 1000 - (nh - 1) * R.P) / 2, g = fitGap('slide', mm(R.WR)) * 1000, steel = 0x9ea2a8;
    const rail = made(`MGN${m.sz} rail`, 'stainless-440c', { box: [mm(R.WR), mm(R.HR), L] }, { color: steel, pattern: { name: 'holes', points: Array.from({ length: nh }, (_, i) => [0, mm(-L * 500 + E1 + i * R.P)] as [number, number]), hole: mm(R.d) / 2 } });
    const skirt = (k: string) => made(`${size} skirt ${k}`, 'stainless-440c', { box: [mm((R.W - R.WR) / 2 - g), mm(R.HR + g - R.H1), mm(blk.L)] }, { color: steel });
    const top = made(`${size} block`, 'stainless-440c', { box: [mm(R.W), mm(R.H - R.HR - g), mm(blk.L)] }, { color: steel, pattern: { name: 'holes', face: '+y', points: [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [mm((a! * R.B) / 2), mm((b! * blk.C) / 2)] as [number, number]), hole: mm(tap(R.M)) / 2, depth: mm(R.Ml) } });
    const on = stack(`${size} rail and carriage`, 1, [{ b: rail }, { b: top, fit: 'slide' }]);
    return onto(onto(on, '-y', skirt('A'), 'touch', undefined, ['lo', 'mid']), '-y', skirt('B'), 'touch', undefined, ['hi', 'mid']); },
  expect: (m, _s, set) => { const R = MGN[m.sz]!, blk = R.blocks[m.t]; return { bound: [mm(R.W), mm(R.H), len(set)], mass: R.kgm * len(set) + blk.kg, tol: 0.01, massTol: 0.35, says: 'its block\'s width and height by its rail\'s length; HIWIN\'s rail a metre and block masses (drawn solid where its grooves, end caps and seals are)' }; },
  tests: [{ inputs: {}, outputs: { pieces: 4, offers: ['MGN12 rail/holes', 'MGN12H block/holes'] } }],
};
// ---- pillow blocks UCP201 to UCP210 ------------------------------------------------------------------------------------
/** UCP housings (makers' tables, typical, as src/nexus/kinds/motion.ts says of their centre heights and lengths): bolt
 *  spacing J, base width A, bolt hole N, foot thickness H1, the insert's width B and outside OD (a UC2xx insert's, the 62xx
 *  bearing's outside), the bolt it takes, mm. */
const UCP_MORE: Record<string, { J: number; A: number; N: number; H1: number; B: number; OD: number; bolt: string }> = {
  '201': { J: 95, A: 38, N: 13, H1: 14, B: 31, OD: 47, bolt: 'M10' }, '202': { J: 95, A: 38, N: 13, H1: 14, B: 31, OD: 47, bolt: 'M10' }, '203': { J: 95, A: 38, N: 13, H1: 14, B: 31, OD: 47, bolt: 'M10' },
  '204': { J: 95, A: 38, N: 13, H1: 14, B: 31, OD: 47, bolt: 'M10' }, '205': { J: 105, A: 38, N: 13, H1: 15, B: 34.1, OD: 52, bolt: 'M10' }, '206': { J: 121, A: 48, N: 17, H1: 17, B: 38.1, OD: 62, bolt: 'M14' },
  '207': { J: 127, A: 48, N: 17, H1: 18, B: 42.9, OD: 72, bolt: 'M14' }, '208': { J: 137, A: 54, N: 17, H1: 18, B: 49.2, OD: 80, bolt: 'M14' }, '209': { J: 146, A: 54, N: 17, H1: 20, B: 49.2, OD: 85, bolt: 'M14' },
  '210': { J: 159, A: 60, N: 20, H1: 21, B: 51.6, OD: 90, bolt: 'M16' },
};
const UC_BORE: Record<string, number> = { '201': 12, '202': 15, '203': 17, '204': 20, '205': 25, '206': 30, '207': 35, '208': 40, '209': 45, '210': 50 };
type PillowRow = { d: number; H: number; L: number } & (typeof UCP_MORE)[string];
const PILLOWS: Record<string, PillowRow> = Object.fromEntries(Object.keys(UCP).map((k) => [`UCP${k}`, { d: UC_BORE[k]!, H: UCP[k]![0], L: UCP[k]![1], ...UCP_MORE[k]! }]));
const WALL = 5; // (the housing's ring round its insert, mm: typical)
const PILLOW: PartFamily<PillowRow> = {
  id: 'piece.pillowblock', name: 'Pillow block (UCP)', gloss: 'A UCP pillow block bearing (201 to 210) by its size: its insert in a ring on a pad between two bolted feet', domains: ['mechanical', 'manufacturing'],
  says: 'A UCP pillow block (201 to 210, bores 12 to 50 mm; housings typical): its insert bearing (its outer ring a 62xx\'s) in a cast-iron ring, its axis along z at its centre height, the ring on a pad between two feet, each foot with its bolt hole. Approximated: the housing drawn as ring, pad and feet (not one casting), its balls and set screws not drawn. It offers UCP<n> insert/axis (a shaft through it: Through a line), UCP<n> foot A/holes and foot B/holes (Bolted joint)',
  rows: PILLOWS, size: 'UCP204', source: 'centre heights and lengths from src/nexus/kinds/motion.ts (makers\' tables, typical); the rest typical',
  recipe: (r, size) => {
    const Rh = r.OD / 2 + WALL, foot = (r.L / 2 - Rh), u = r.J / 2 - (r.L / 2 + Rh) / 2;
    const ring = over(made(`${size} insert`, 'steel-chrome', { tube: [mm(r.d) / 2, mm(r.OD) / 2, mm(r.B)] }, { color: 0xb8bcc2 }), `${size} insert/axis`, made(`${size} housing`, 'cast-iron', { tube: [mm(r.OD) / 2, mm(Rh), mm(r.B)] }, { color: 0x2f4f7f }), 'mid', 'touch');
    const mid = stack(`${size} housing on its pad`, 1, [{ b: made(`${size} pad`, 'cast-iron', { box: [mm(2 * Rh), mm(r.H - Rh), mm(r.A)] }, { color: 0x2f4f7f }) }, { b: turn(ring, 0, 90) }]);
    const feet = (k: string, x: number) => made(`${size} foot ${k}`, 'cast-iron', { box: [mm(foot), mm(r.H1), mm(r.A)] }, { color: 0x2f4f7f, pattern: { name: 'holes', points: [[mm(x), 0]], hole: mm(r.N) / 2 } });
    return stack(`${size} pillow block`, 0, [{ b: feet('A', -u) }, { b: mid }, { b: feet('B', u) }], undefined, true); },
  expect: (r) => ({ bound: [mm(r.L), mm(r.H + r.OD / 2 + WALL), mm(r.A)], tol: 0.01, says: 'its length, centre height and ring, its base width' }),
  tests: [{ inputs: {}, outputs: { pieces: 5, offers: ['UCP204 foot A/holes', 'UCP204 foot B/holes', 'UCP204 housing/axis', 'UCP204 insert/axis'] } }],
};
// ---- GT2 belt, a closed loop laid as a run round two pulleys ------------------------------------------------------------
// (a GT2 6 mm belt: 2 mm pitch, 1.38 mm thick (Gates PowerGrip GT2, typical of 6 mm belts); drawn as a round cord of its
// section's area, its teeth and flat section not drawn; the closed loops sold, typical)
const BELT_A = 6 * 1.38, BELT_R = Math.sqrt(BELT_A / Math.PI);
const BELTS: Record<string, number> = Object.fromEntries([110, 158, 200, 280, 300, 400, 610, 852].map((L) => [String(L), L]));
const pitchR = (z: number) => (z * 2) / Math.PI / 2;
const BELT: PartFamily<number> = {
  id: 'piece.gt2belt', name: 'GT2 belt loop', gloss: 'A closed GT2 belt loop (6 mm) by its length, laid round two equal pulleys', domains: ['mechanical', 'manufacturing'],
  says: 'A closed GT2 belt (6 mm wide, 2 mm pitch) by its length, laid as a run round two equal pulleys of so many teeth: two straights their centre distance long and two half turns on the pulleys\' pitch circles (z × 2 / π), in the x–y plane. Drawn as a round cord of its section\'s area (its teeth and flat section not drawn). Its straights offer their axes',
  rows: BELTS, size: '200', source: 'the GT2 closed loops sold (typical); pitch 2 mm, 6 × 1.38 mm (Gates PowerGrip GT2, typical)',
  settings: [{ key: 'teeth', label: 'Pulley teeth (both)', type: 'number', default: 20 }],
  cannot: (L, size, set) => { const z = Number(set.teeth), C = (L - 2 * Math.PI * pitchR(z)) / 2; return !(Number.isInteger(z) && z >= 12) ? `pulleys of 12 teeth or more (${String(set.teeth)})` : C > 0 ? null : `a ${size} mm loop has no straights round two ${z}-tooth pulleys (once round them is ${(2 * Math.PI * pitchR(z)).toFixed(1)} mm): fewer teeth or a longer belt`; },
  recipe: (L, size, set) => { const z = Number(set.teeth), R = mm(pitchR(z)), C = mm((L - 2 * Math.PI * pitchR(z)) / 2), t = { mat: 'nbr', ro: mm(BELT_R), color: 0x1c1c1c };
    const segs: RunSeg[] = [{ ...t, name: `GT2 ${size} belt straight A`, straight: C }, { ...t, name: `GT2 ${size} belt round A`, bend: 180, R }, { ...t, name: `GT2 ${size} belt straight B`, straight: C }, { ...t, name: `GT2 ${size} belt round B`, bend: 180, R }];
    return run(`GT2 ${size} belt`, segs); },
  expect: (L, _s, set) => { const R = mm(pitchR(Number(set.teeth))), r = mm(BELT_R), C = mm((L - 2 * Math.PI * pitchR(Number(set.teeth))) / 2); return { bound: [2 * R + 2 * r, C + 2 * R + 2 * r, 2 * r], mass: mm(mm(BELT_A)) * mm(L) * rho('nbr'), tol: 0.01, massTol: 0.03, says: 'its run\'s bound; nominal mass, its section by its length in rubber' }; },
  tests: [{ inputs: {}, outputs: { pieces: 4 } }],
};
// ---- wheels (hub and tyre), castors ------------------------------------------------------------------------------------
/** Wheels for small robots and carts: diameter → tyre width, hub bore, mm (the sizes sold, typical). */
const WHEELS: Record<string, [number, number, number]> = { '40': [40, 16, 5], '50': [50, 20, 5], '60': [60, 22, 6], '65': [65, 26, 6], '75': [75, 28, 6], '80': [80, 30, 8], '100': [100, 35, 8], '125': [125, 38, 10] };
const wheelOf = (name: string, D: number, W: number, bore: number): Block => {
  const t = Math.max(3, 0.12 * D), Rr = D / 2 - t, rs = bore / 2 + 4, wt = 0.35 * W;
  const hub = made(`${name} hub`, 'pp', { lathe: { pts: [[0, -W / 2], [rs, -W / 2], [rs, -wt / 2], [Rr - 2, -wt / 2], [Rr - 2, -W / 2], [Rr, -W / 2], [Rr, W / 2], [Rr - 2, W / 2], [Rr - 2, wt / 2], [rs, wt / 2], [rs, W / 2], [0, W / 2]].map(([a, b]) => [mm(a!), mm(b!)] as [number, number]), bore: mm(bore) / 2 } }, { color: 0xd8d8d8 });
  return over(hub, `${name} hub/axis`, made(`${name} tyre`, 'rubber', { tube: [mm(Rr), mm(D) / 2, mm(W)] }, { color: 0x1c1c1c }), 'mid', 'touch');
};
const WHEEL: PartFamily<[number, number, number]> = {
  id: 'piece.wheel', name: 'Wheel', gloss: 'A small wheel, 40 to 125 mm: a dished plastic hub and its rubber tyre', domains: ['mechanical', 'everyday', 'vehicles'],
  says: 'A wheel (40 to 125 mm, sizes typical of small robot and cart wheels) by its diameter: a turned polypropylene hub (boss, web and rim) with its bore, and its rubber tyre over the rim. It offers <size> mm wheel hub/axis: it slides over a shaft of its bore (Over a shaft) or a shaft passes through it; turned, it stands on its tyre',
  rows: WHEELS, size: '65', source: 'the wheel sizes sold for small robots and carts (typical)',
  recipe: ([D, W, b], size) => wheelOf(`${size} mm wheel`, D, W, b),
  expect: ([D, W]) => ({ bound: [mm(D), mm(W), mm(D)], tol: 0.01, says: 'its diameter by its width' }),
  tests: [{ inputs: {}, outputs: { pieces: 2, offers: ['65 mm wheel hub/axis', '65 mm wheel tyre/axis'] } }],
};
/** Castors by wheel diameter (src/nexus/kinds/stock.ts's sizes; their box, typical: (0.9 d + 20) square, 1.3 d + 10 high). */
const CASTORS: Record<string, number> = Object.fromEntries([30, 40, 50, 75, 100, 125].map((d) => [String(d), d]));
const CASTOR: PartFamily<number> = {
  id: 'piece.castor', name: 'Castor', gloss: 'A plate castor by its wheel: wheel, fork, swivel and its mounting plate with four holes', domains: ['mechanical', 'everyday', 'vehicles'],
  says: 'A plate castor by its wheel (30 to 125 mm; its box as the kinds give it, typical): its wheel between the fork\'s two legs on an 8 mm axle through its bore and both legs, the fork\'s bridge on the legs, the swivel and the mounting plate with four bolt holes on top. Approximated: the ball race not drawn, the legs flat plates. It offers <d> mm castor plate/holes (bolt it up under a deck: Bolted joint)',
  rows: CASTORS, size: '50', source: 'src/nexus/kinds/stock.ts castor sizes and box (typical); the legs, the axle and the tyre\'s clearance under the bridge typical',
  recipe: (d, size) => { const P = 0.9 * d + 20, W = 0.3 * d + 10, tb = 3 + 0.02 * d, tp = 3 + 0.01 * d, c = 2, hs = 0.3 * d + 10 - tb - tp - c, bolt = d >= 75 ? 'M6' : 'M5', a = 0.35 * P, name = `${size} mm castor`;
    // (the wheel between two legs along its axle, each leg's axle line at its foot, aligned on it; the axle passed through
    // the one leg, the wheel's bore and the other; then the whole stood: the axle along x, the legs up to the bridge, which
    // rests on them, the tyre 2 mm under it (typical))
    const lw = 0.3 * d + 8, e = 8, lh = d / 2 + c + e, leg = () => made(`${name} fork leg`, 'steel-low', { box: [mm(lw), mm(tb), mm(lh)] }, { color: 0xa9acb0, pattern: { name: 'axle', points: [[0, mm(-(lh / 2 - e))]] } });
    const between = stack(`${name} wheel`, 1, [{ b: leg() }, { b: wheelOf(`${name} wheel`, d, W, 8), fit: 'slide' }, { b: leg(), fit: 'slide' }], `${name} fork leg/axle`);
    const axled = through(between, made(`${name} axle`, 'steel-low', { cyl: [mm(4) - 0.00025, mm(2 * tb + W) + 0.0005] }, { color: 0x8a8c90 }), { port: `${name} fork leg/axle`, k: 0, from: 'lo' }, 'slide');
    const wheel = turn(turn(axled, 2, -90), 0, -90);
    return stack(name, 1, [{ b: wheel }, { b: made(`${name} fork`, 'steel-low', { box: [mm(W + 2 * tb) + 0.0005, mm(tb), mm(0.4 * d + 10)] }, { color: 0xa9acb0 }) },
      { b: made(`${name} swivel`, 'steel-low', { cyl: [mm(0.18 * P), mm(hs)] }, { color: 0xa9acb0 }) },
      { b: made(`${name} plate`, 'steel-low', { box: [mm(P), mm(tp), mm(P)] }, { color: 0xa9acb0, pattern: { name: 'holes', points: [[-a, -a], [a, -a], [a, a], [-a, a]].map(([x, z]) => [mm(x!), mm(z!)] as [number, number]), hole: mm(METRIC[bolt]!.clear!) / 2 } }) }]); },
  expect: (d) => ({ bound: [mm(0.9 * d + 20), mm(1.3 * d + 10), mm(0.9 * d + 20)], tol: 0.01, says: 'its box as the kinds give it (typical)' }),
  tests: [{ inputs: {}, outputs: { pieces: 8 } }],
};
// ---- motors: brushed DC cans, gear motors, hobby servos (envelopes) ----------------------------------------------------
/** Each can size's shaft: diameter and how far it stands out, mm (typical of the makers' drawings). */
const DCM_SHAFT: Record<string, [number, number]> = { '130': [2, 8], '180': [2, 9], '280': [2.3, 10], '370': [2.3, 11], '385': [2.3, 12], '540': [3.17, 15], '550': [3.17, 15], '775': [5, 17] };
const DCMS: Record<string, [number, number, number, number, number]> = Object.fromEntries(Object.entries(DCM).map(([k, [d, L, g]]) => [k, [d, L, g, ...DCM_SHAFT[k]!]]));
const DCMOTOR: PartFamily<[number, number, number, number, number]> = {
  id: 'piece.dcmotor', name: 'Brushed DC motor (can)', gloss: 'A brushed DC can motor, 130 to 775, as its envelope: can, front boss and shaft', domains: ['electrical', 'mechanical'],
  says: 'A brushed DC can motor by its size code (130 to 775; can sizes as families.ts gives them, typical): its can, its front bearing boss and its shaft stacked on its face. It offers <n> motor shaft/axis, written shaft/axis for short (a wheel, a pulley, a prop or a coupler over it: Over a shaft, where hi, a clear fit for a joint the motor drives); never over its can\'s axis (the can is solid: no sleeve fits it); stack it on its face or slide a clamp round its can',
  rows: DCMS, size: '130', source: 'families.ts DCM (can sizes and masses, typical); shafts typical',
  envelope: 'its can is its outline (no magnets, armature or brushes inside), so its drawn mass is a solid can\'s, not the motor\'s',
  recipe: ([d, L, , sd, so], size) => stack(`${size} motor`, 1, [{ b: made(`${size} motor can`, 'steel-low', { cyl: [mm(d) / 2, mm(L)] }, { color: 0xb0b4b8 }) }, { b: made(`${size} motor boss`, 'brass', { cyl: [mm(0.3 * d) / 2, mm(1.5)] }) }, { b: made(`${size} motor shaft`, 'steel-alloy', { cyl: [mm(sd) / 2, mm(so)] }) }]),
  expect: ([d, L, g, , so]) => ({ bound: [mm(d), mm(L + 1.5 + so), mm(d)], mass: g / 1000, tol: 0.01, says: 'its can by its length, boss and shaft' }),
  tests: [{ inputs: {}, outputs: { pieces: 3, offers: ['130 motor boss/axis', '130 motor can/axis', '130 motor shaft/axis'] } }],
};
/** Gear motors (src/nexus/kinds/motion.ts GM: diameter and length; typical): the length split between motor and gearbox
 *  and the output shaft (diameter, out), mm, typical. */
const GM_PARTS: Record<string, { motor: number; shaft: [number, number] }> = { N20: { motor: 15, shaft: [3, 10] }, JGA25: { motor: 31, shaft: [4, 12] }, '37GB': { motor: 38, shaft: [6, 15] } };
const GEARMOTOR: PartFamily<{ d: number; L: number; motor: number; shaft: [number, number] }> = {
  id: 'piece.gearmotor', name: 'DC gear motor', gloss: 'A small DC gear motor (N20, 25 mm, 37 mm) as its envelope: motor, gearbox and output shaft', domains: ['electrical', 'mechanical'],
  says: 'A DC gear motor by its frame (N20, JGA25, 37GB; their sizes as the kinds give them, typical): its motor, its gearbox and its output shaft stacked (the N20\'s flattened can and gearbox drawn as a can and a box; the shaft\'s flat not drawn; its output drawn on its axis). It offers <frame> gear motor shaft/axis, written shaft/axis for short (a wheel or a prop over it: Over a shaft, where hi, a clear fit: the joint its gear motor holds and drives); never over its can\'s axis',
  rows: Object.fromEntries(Object.entries(GM).map(([k, g]) => [k, { d: g.d, L: g.L, ...GM_PARTS[k]! }])), size: 'N20', source: 'src/nexus/kinds/motion.ts GM (frames, typical); the split and shafts typical',
  envelope: 'its can and gearbox are their outlines (no windings or gears inside), so its drawn mass is not the motor\'s',
  recipe: (r, size) => { const n = `${size} gear motor`, gb = size === 'N20' ? made(`${n} gearbox`, 'zamak', { box: [mm(r.d), mm(r.L - r.motor), mm(0.83 * r.d)] }) : made(`${n} gearbox`, 'zamak', { cyl: [mm(r.d) / 2, mm(r.L - r.motor)] });
    return stack(n, 1, [{ b: made(`${n} can`, 'steel-low', { cyl: [mm(r.d) / 2, mm(r.motor)] }, { color: 0xb0b4b8 }) }, { b: gb }, { b: made(`${n} shaft`, 'steel-alloy', { cyl: [mm(r.shaft[0]) / 2, mm(r.shaft[1])] }) }]); },
  expect: (r) => ({ bound: [mm(r.d), mm(r.L + r.shaft[1]), mm(r.d)], tol: 0.01, says: 'its frame by its length and shaft' }),
  tests: [{ inputs: {}, outputs: { pieces: 3, offers: ['N20 gear motor can/axis', 'N20 gear motor shaft/axis'] } }],
};
/** Hobby servos, mm and g (vendor pages, typical; SG90 and MG996R's boxes and masses as families.ts SERVOS gives them):
 *  its case L × W, its height to the case's top Hc, the tabs (their span, thickness, height of their underside above the
 *  case's bottom), the tabs' holes (spacing, diameter), the output (its offset from the case's middle along L, the
 *  spline's diameter and height), its mass. */
const SERVO_ROWS: Record<string, { L: number; W: number; Hc: number; span: number; tt: number; th: number; hs: number; hd: number; off: number; sd: number; sh: number; g?: number }> = {
  SG90: { L: SERVOS.micro!.box[0], W: SERVOS.micro!.box[1], Hc: SERVOS.micro!.box[2] - 4, span: 32.5, tt: 2.5, th: 16, hs: 27.8, hd: 2, off: 5.5, sd: 4.8, sh: 4, g: SERVOS.micro!.g },
  MG90S: { L: 22.8, W: 12.2, Hc: 24.5, span: 32.5, tt: 2.5, th: 15.5, hs: 28, hd: 2, off: 5.5, sd: 4.8, sh: 4, g: 13.4 },
  MG996R: { L: SERVOS.standard!.box[0], W: SERVOS.standard!.box[1], Hc: SERVOS.standard!.box[2] - 5, span: 54, tt: 2.5, th: 27, hs: 48, hd: 4.3, off: 10, sd: 5.8, sh: 5, g: SERVOS.standard!.g },
  standard: { L: 40, W: 20, Hc: 33, span: 54, tt: 2.5, th: 26, hs: 48, hd: 4.3, off: 10, sd: 5.8, sh: 5 },
};
const SERVO: PartFamily<(typeof SERVO_ROWS)[string]> = {
  id: 'piece.servo', name: 'Hobby servo', gloss: 'A hobby servo (SG90, MG90S, MG996R, standard size) as its envelope: case, mounting tabs with their holes, output spline', domains: ['electrical', 'mechanical', 'everyday'],
  says: 'A hobby servo by its model (SG90, MG90S, MG996R, a standard size; vendor figures, typical): its case below its tabs, the tabs with their two holes, its case above, its output spline (toothed) off the middle toward one end, and a stub of its three-wire lead out of the case\'s foot at that end. It offers <model> tabs/holes (screw it down: Bolted joint) and <model> spline/axis (a horn or a wheel over it: Over a shaft)',
  rows: SERVO_ROWS, size: 'SG90', source: 'families.ts SERVOS (SG90, MG996R), vendor pages for the rest (typical)',
  envelope: 'its case is its outline (no motor, gears or board inside), so its drawn mass is a solid case\'s, not the servo\'s; its lead a stub, its wires as their insulation',
  recipe: (r, size) => {
    const tabs = made(`${size} tabs`, 'abs', { box: [mm(r.span), mm(r.tt), mm(r.W)] }, { color: 0x2a4fa0, pattern: { name: 'holes', points: [[mm(-r.hs / 2), 0], [mm(r.hs / 2), 0]], hole: mm(r.hd) / 2 } });
    // (its lead's three wires (brown, red, orange, Ø1 mm on a micro servo, 1.2 on a standard one, typical) out of the case's
    // foot at its output's end, a stub as long as the tabs stand past the case (the lead itself, about 25 cm, not drawn);
    // its output spline toothed (21 teeth on a micro servo's, 25 on a standard one's, typical of their horns, an estimate),
    // a section stood up along its axis)
    const dw = r.W < 15 ? 1.0 : 1.2, stub = (r.span - r.L) / 2 - 0.3, teeth = r.W < 15 ? 21 : 25, ro = mm(r.sd) / 2, ri = ro - mm(r.W < 15 ? 0.25 : 0.3);
    const below = made(`${size} case below`, 'abs', { box: [mm(r.L), mm(r.th), mm(r.W)] }, { color: 0x2a4fa0, pattern: { name: 'lead', face: '+x', points: [[mm(-r.th / 2 + 0.5 + dw / 2), 0]] } });
    const body = stack(`${size} case`, 1, [{ b: below }, { b: tabs }, { b: made(`${size} case above`, 'abs', { box: [mm(r.L), mm(r.Hc - r.th - r.tt), mm(r.W)] }, { color: 0x2a4fa0, pattern: { name: 'output', points: [[mm(r.off), 0]] } }) }]);
    const spline = turn(made(`${size} spline`, 'pom', { section: { pts: Array.from({ length: 2 * teeth }, (_, k) => { const a = (Math.PI * k) / teeth, q = k % 2 ? ri : ro; return [q * Math.cos(a), q * Math.sin(a)] as [number, number]; }), L: mm(r.sh) } }, { color: 0xf2f2f2 }), 0, -90);
    const wire = (c: string, color: number) => turn(made(`${size} lead ${c} wire`, 'pvc', { cyl: [mm(dw) / 2, mm(stub)] }, { color }), 2, 90);
    const lead = stack(`${size} lead`, 2, [{ b: wire('brown', 0x6b3e1f) }, { b: wire('red', 0xc0262d) }, { b: wire('orange', 0xf08a24) }]);
    return onto(stack(`${size} servo`, 1, [{ b: body }, { b: spline }], `${size} case above/output`), '+x', lead, 'touch', `${size} case below/lead`); },
  expect: (r) => ({ bound: [mm(r.span), mm(r.Hc + r.sh), mm(r.W)], ...(r.g !== undefined ? { mass: r.g / 1000 } : {}), tol: 0.01, says: 'its tabs\' span, its height to the spline\'s top, its width' }),
  tests: [{ inputs: {}, outputs: { pieces: 7, offers: ['SG90 case above/output', 'SG90 case below/lead', 'SG90 lead brown wire/axis', 'SG90 lead orange wire/axis', 'SG90 lead red wire/axis', 'SG90 spline/axis', 'SG90 tabs/holes'] } }],
};

// ---- more held bearings: SCxUU blocks round an LMxUU, UCF four-bolt flanges; NEMA motor plates -------------------------
/** SCxUU housings (vendor tables, typical): width W, height H, length L, the shaft's height above its base h, its four
 *  tapped holes B × C on top and their thread, mm; the LMxUU it holds is its own size's. */
const SC_ROWS: Record<string, { d: number; W: number; H: number; L: number; h: number; B: number; C: number; M: string }> = {
  SC6UU: { d: 6, W: 30, H: 18, L: 25, h: 9, B: 20, C: 15, M: 'M4' }, SC8UU: { d: 8, W: 34, H: 22, L: 30, h: 11, B: 24, C: 18, M: 'M4' },
  SC10UU: { d: 10, W: 40, H: 26.5, L: 35, h: 13.5, B: 28, C: 21, M: 'M5' }, SC12UU: { d: 12, W: 42, H: 28.5, L: 36, h: 15, B: 30.5, C: 26, M: 'M5' },
  SC16UU: { d: 16, W: 50, H: 38.5, L: 44, h: 19, B: 36, C: 34, M: 'M5' }, SC20UU: { d: 20, W: 54, H: 41, L: 50, h: 21, B: 40, C: 40, M: 'M6' },
};
const SCUU: PartFamily<(typeof SC_ROWS)[string]> = {
  id: 'piece.scuu', name: 'Linear bushing block (SCxUU)', gloss: 'An SCxUU aluminium block holding its LMxUU bushing, its shaft along z, four tapped holes on top', domains: ['mechanical', 'manufacturing'],
  says: 'An SCxUU block (SC6UU to SC20UU, vendor sizes, typical): an aluminium block, its bore along z at its shaft height with its LMxUU bushing passed into it (Through a line), four tapped holes on its top. It offers LM<d>UU cage/axis (a shaft through it, along z) and SC<d>UU block/holes (what it carries screws down onto it)',
  rows: SC_ROWS, size: 'SC8UU', source: 'vendor tables of SCxUU blocks (typical); the bushing BOSL2\'s',
  recipe: (r, size) => { const lm = LMUU_BOSL2[r.d]!, name = `${size} block`;
    const block = made(name, 'al-6061', { box: [mm(r.W), mm(r.H), mm(r.L)] }, { color: 0xc4c8cc, patterns: [{ name: 'bore', face: '+z', points: [[0, mm(r.h - r.H / 2)]], hole: mm(lm[0]) / 2 },
      { name: 'holes', face: '+y', points: [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [mm((a! * r.B) / 2), mm((b! * r.C) / 2)] as [number, number]), hole: mm(tap(r.M)) / 2, depth: mm(Math.min(8, r.H / 2)) }] });
    return through(block, build(LMUU, `LM${r.d}UU`), { port: `${name}/bore`, from: 'lo' }, 'touch'); },
  expect: (r) => ({ bound: [mm(r.W), mm(r.H), mm(r.L)], tol: 0.01, says: 'its block' }),
  tests: [{ inputs: {}, outputs: { pieces: 3, offers: ['LM8UU cage/axis', 'LM8UU sleeve/axis', 'SC8UU block/bore', 'SC8UU block/holes'] } }],
};
/** UCF four-bolt flange units (makers' tables, typical): the square A, its bolts' square J, their holes N, the flange's
 *  thickness T, the insert's outside OD and width B, the bolt, mm. */
const UCF_ROWS: Record<string, { d: number; A: number; J: number; N: number; T: number; OD: number; B: number; bolt: string }> = Object.fromEntries(([
  ['201', 12, 86, 64, 12, 15, 47, 31, 'M10'], ['202', 15, 86, 64, 12, 15, 47, 31, 'M10'], ['203', 17, 86, 64, 12, 15, 47, 31, 'M10'], ['204', 20, 86, 64, 12, 15, 47, 31, 'M10'],
  ['205', 25, 95, 70, 12, 16, 52, 34.1, 'M10'], ['206', 30, 108, 83, 12, 18, 62, 38.1, 'M10'], ['207', 35, 117, 92, 14, 19, 72, 42.9, 'M12'], ['208', 40, 130, 102, 16, 21, 80, 49.2, 'M14'],
  ['209', 45, 137, 105, 16, 22, 85, 49.2, 'M14'], ['210', 50, 143, 111, 16, 22, 90, 51.6, 'M14'],
] as const).map(([k, d, A, J, N, T, OD, B, bolt]) => [`UCF${k}`, { d, A, J, N, T, OD, B, bolt }]));
const UCF: PartFamily<(typeof UCF_ROWS)[string]> = {
  id: 'piece.flangebearing', name: 'Flange bearing (UCF)', gloss: 'A UCF four-bolt flange bearing (201 to 210): its square flange, its insert in its ring through the flange', domains: ['mechanical', 'manufacturing'],
  says: 'A UCF four-bolt flange bearing (201 to 210, bores 12 to 50 mm; flanges typical): a square cast-iron flange with its four bolt holes, and its insert bearing in its ring passed through the flange\'s bore (the ring standing proud of it where the insert is wider). Approximated: flange and ring two pieces, the balls and set screws not drawn. It offers UCF<n> insert/axis (a shaft through it), UCF<n> flange/holes (bolt it to a wall: Bolted down to a plate)',
  rows: UCF_ROWS, size: 'UCF204', source: 'makers\' tables of UCF units (typical), the bores UC2xx',
  recipe: (r, size) => { const Rh = r.OD / 2 + WALL;
    const flange = made(`${size} flange`, 'cast-iron', { box: [mm(r.A), mm(r.T), mm(r.A)] }, { color: 0x2f4f7f, patterns: [{ name: 'holes', points: [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [mm((a! * r.J) / 2), mm((b! * r.J) / 2)] as [number, number]), hole: mm(r.N) / 2 }, { name: 'bore', points: [[0, 0]], hole: mm(Rh) }] });
    const ring = over(made(`${size} insert`, 'steel-chrome', { tube: [mm(r.d) / 2, mm(r.OD) / 2, mm(r.B)] }, { color: 0xb8bcc2 }), `${size} insert/axis`, made(`${size} housing`, 'cast-iron', { tube: [mm(r.OD) / 2, mm(Rh), mm(r.B)] }, { color: 0x2f4f7f }), 'mid', 'touch');
    return through(flange, ring, { port: `${size} flange/bore`, from: 'lo' }, 'touch'); },
  expect: (r) => ({ bound: [mm(r.A), mm(Math.max(r.T, r.B)), mm(r.A)], tol: 0.01, says: 'its flange\'s square, the insert\'s width' }),
  tests: [{ inputs: {}, outputs: { pieces: 3, offers: ['UCF204 flange/bore', 'UCF204 flange/holes', 'UCF204 housing/axis', 'UCF204 insert/axis'] } }],
};
type NemaRow7 = [number, number, number, number, number, number, number];
const MOTORPLATE: PartFamily<NemaRow7> = {
  id: 'piece.motorplate', name: 'NEMA motor plate', gloss: 'A flat aluminium plate a NEMA stepper bolts to: its four screw holes, its pilot\'s hole, two mounting holes', domains: ['mechanical', 'manufacturing'],
  says: 'A flat aluminium motor plate for a NEMA frame (6 to 42; the frame\'s figures BOSL2\'s): its side the frame\'s and 24 mm, 3 mm thick to NEMA 14 and 5 mm above (typical), the frame\'s four screw holes (clearance, the screw and 0.4 mm) on their square, a hole for its pilot (1 mm over it), and two M5 holes (ISO 273) to bolt it down. It offers NEMA <n> motor plate/holes, /pilot and /mount (Bolted joint)',
  rows: Object.fromEntries(Object.entries(NEMA_BOSL2).map(([k, v]) => [k, v as NemaRow7])), size: '17', source: 'NEMA ICS 16 frames as BOSL2 gives them (src/nexus/parts/bosl2.ts); the plate typical',
  recipe: ([w, , pd, sp, sd], size) => { const S = w + 24, t = Number(size) <= 14 ? 3 : 5, a = sp / 2;
    return made(`NEMA ${size} motor plate`, 'al-6061', { box: [mm(S), mm(t), mm(S)] }, { color: 0xc4c8cc, patterns: [{ name: 'holes', points: [[-a, -a], [a, -a], [a, a], [-a, a]].map(([x, z]) => [mm(x!), mm(z!)] as [number, number]), hole: mm(sd + 0.4) / 2 },
      { name: 'pilot', points: [[0, 0]], hole: mm(pd + 1) / 2 }, { name: 'mount', points: [[0, mm(-S / 2 + 6)], [0, mm(S / 2 - 6)]], hole: mm(METRIC.M5!.clear!) / 2 }] }); },
  expect: ([w, , pd, , sd], size) => { const S = mm(w + 24), t = mm(Number(size) <= 14 ? 3 : 5); return { bound: [S, t, S], mass: (S * S - 4 * disc(mm(sd + 0.4)) - disc(mm(pd + 1)) - 2 * disc(mm(METRIC.M5!.clear!))) * t * rho('al-6061'), tol: 0.01, massTol: 0.02, says: 'its side by its thickness; nominal mass, the plate less its holes' }; },
  tests: [{ inputs: {}, outputs: { pieces: 1, offers: ['NEMA 17 motor plate/holes', 'NEMA 17 motor plate/mount', 'NEMA 17 motor plate/pilot'] } }],
};

/** Every family of motion and drive, for parts/index.ts. */
export const MOTION_FAMILIES = [EXTRUSION, CORNER, SHAFT, LEADSCREW, LEADNUT, COUPLER, SHAFTCOLLAR, LMUU, SCUU, RAIL, PILLOW, UCF, BELT, WHEEL, CASTOR, DCMOTOR, GEARMOTOR, SERVO, MOTORPLATE] as PartFamily<unknown>[];
