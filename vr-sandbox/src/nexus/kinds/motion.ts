// Power transmission and motion: bearings of every other kind, belts and their pulleys, racks, worms, bevels, helical and
// internal gears, couplings, collars, linear guides, ball screws, springs that are not compression springs, gas springs,
// and the motors and actuators sold by size. Standards' sizes where there are standards; makers' typical tables
// otherwise, said so.

import { ax, bare, cyl, gOf, matOf, pref, range, ring, tagged, unit, type KindDef, type P } from './core';
/** NEMA frame sizes, mm across the body. */
export const NEMA: Record<string, number> = { '8': 20.3, '11': 28.2, '14': 35.2, '17': 42.3, '23': 57.15, '34': 86 };
/** NEMA frames' faces: the four holes' square, their thread (tapped 4.5 mm deep on 8–17, through holes on 23 and 34),
 *  the pilot boss's diameter and how far it stands proud, the shaft, mm (NEMA ICS 16; motor makers' drawings, typical). */
export const NEMA_FACE: Record<string, { holes: number; thread: string; pilot: number; boss: number; shaft: number; out: number; through?: boolean }> = {
  '8': { holes: 16, thread: 'M2', pilot: 15, boss: 1.5, shaft: 4, out: 15 }, '11': { holes: 23, thread: 'M2.5', pilot: 22, boss: 2, shaft: 5, out: 20 },
  '14': { holes: 26, thread: 'M3', pilot: 22, boss: 2, shaft: 5, out: 20 }, '17': { holes: 31, thread: 'M3', pilot: 22, boss: 2, shaft: 5, out: 24 },
  '23': { holes: 47.14, thread: 'M5', pilot: 38.1, boss: 1.6, shaft: 6.35, out: 21, through: true }, '34': { holes: 69.6, thread: 'M5', pilot: 73, boss: 2, shaft: 14, out: 32, through: true },
};
/** ISO 273 medium clearance holes, mm. */
export const CLEAR: Record<string, number> = { M2: 2.4, 'M2.5': 2.9, M3: 3.4, M4: 4.5, M5: 5.5, M6: 6.6, M8: 9, M10: 11, M12: 13.5, M16: 17.5, M20: 22 };

const n = (p: P, k: string) => Number(p[k]);
const madeOf = (p: P) => matOf(p.matter);

/** ISO 104 thrust ball bearings, 511 series: bore, outside, height. */
const T511: Record<string, [number, number, number]> = { '51100': [10, 24, 9], '51101': [12, 26, 9], '51102': [15, 28, 9], '51103': [17, 30, 9], '51104': [20, 35, 10], '51105': [25, 42, 11], '51106': [30, 47, 11], '51107': [35, 52, 12], '51108': [40, 60, 13], '51110': [50, 70, 14] };
/** Drawn-cup needle roller bearings (ISO 3245), HK: bore, outside, width. */
const HK: Record<string, [number, number, number]> = { HK0408: [4, 8, 8], HK0509: [5, 9, 9], HK0608: [6, 10, 8], HK0810: [8, 12, 10], HK1010: [10, 14, 10], HK1210: [12, 18, 10], HK1412: [14, 20, 12], HK1512: [15, 21, 12], HK2016: [20, 26, 16], HK2520: [25, 32, 20], HK3020: [30, 37, 20] };
/** Flanged miniature bearings: bore, outside, width, flange diameter. */
const FB: Record<string, [number, number, number, number]> = { F623: [3, 10, 4, 11.5], F624: [4, 13, 5, 15], F625: [5, 16, 5, 18], F626: [6, 19, 6, 22], F608: [8, 22, 7, 25], F688: [8, 16, 5, 18], F695: [5, 13, 4, 15], F693: [3, 8, 4, 9.5] };
/** UC insert bearings in housings: bore. */
const UC: Record<string, number> = { '201': 12, '202': 15, '203': 17, '204': 20, '205': 25, '206': 30, '207': 35, '208': 40, '209': 45, '210': 50 };
/** UCP pillow blocks: centre height and length, mm (makers' tables, typical). */
const UCP: Record<string, [number, number]> = { '201': [30.2, 127], '202': [30.2, 127], '203': [30.2, 127], '204': [33.3, 127], '205': [36.5, 140], '206': [42.9, 165], '207': [47.6, 167], '208': [49.2, 184], '209': [54, 190], '210': [57.2, 206] };
/** ISO 3547 wrapped plain bushes (steel-backed, PTFE-lined): bore → outside. */
const DU: Record<number, number> = { 3: 4.5, 4: 5.5, 5: 7, 6: 8, 8: 10, 10: 12, 12: 14, 14: 16, 15: 17, 16: 18, 18: 20, 20: 23, 22: 25, 25: 28, 30: 34, 35: 39, 40: 44, 50: 55 };
/** Rod ends, DIN ISO 12240-4 series K: bore → thread. */
const RODEND: Record<number, string> = { 5: 'M5', 6: 'M6', 8: 'M8', 10: 'M10', 12: 'M12', 14: 'M14', 16: 'M16', 18: 'M18x1.5', 20: 'M20x1.5', 22: 'M22x1.5', 25: 'M24x2', 30: 'M30x2' };
/** Cam followers (KR): outside → stud thread. */
const KR: Record<string, [number, string]> = { KR16: [16, 'M6'], KR19: [19, 'M8'], KR22: [22, 'M10'], KR26: [26, 'M10'], KR30: [30, 'M12'], KR32: [32, 'M12'], KR35: [35, 'M16'], KR40: [40, 'M18'], KR47: [47, 'M20'], KR52: [52, 'M20'] };
/** Shaft supports, SK: shaft centre height and width, mm (makers' tables, typical). */
const SK: Record<number, [number, number]> = { 8: [20, 42], 10: [20, 42], 12: [23, 42], 13: [23, 42], 16: [27, 48], 20: [31, 60], 25: [35, 70], 30: [42, 84] };
/** Profile rail guides (HG type): rail width, rail height, kg a metre; a carriage's basic dynamic load C (kN). */
const HG: Record<number, [number, number, number, number]> = { 15: [15, 15, 1.45, 11.38], 20: [20, 17.5, 2.21, 17.75], 25: [23, 22, 3.21, 26.48], 30: [28, 26, 4.47, 38.74], 35: [34, 29, 6.3, 49.52], 45: [45, 38, 10.41, 77.57] };
/** V-belt sections (ISO 4184): top width, height, kg a metre (typical). */
const VB: Record<string, [number, number, number]> = { Z: [10, 6, 0.06], A: [13, 8, 0.11], B: [17, 11, 0.19], C: [22, 14, 0.3], SPZ: [9.7, 8, 0.07], SPA: [12.7, 10, 0.12], SPB: [16.3, 13, 0.2], SPC: [22, 18, 0.37] };
/** The R20 datum lengths V-belts are listed in, mm. */
const VLEN = [400, 450, 500, 560, 630, 710, 800, 900, 1000, 1120, 1250, 1400, 1600, 1800, 2000, 2240, 2500, 2800, 3150, 3550, 4000, 4500, 5000];
/** HTD pitches: the widths sold, and the pitch-line differential a (pitch diameter − outside, halved). */
const HTD: Record<string, [number[], number]> = { '3M': [[6, 9, 15], 0.381], '5M': [[9, 15, 25], 0.572], '8M': [[20, 30, 50, 85], 0.686], '14M': [[40, 55, 85, 115], 1.397] };
const MODS = [0.5, 0.8, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5];
/** DIN 705 set collars: bore → outside, width. */
const COLLAR: Record<number, [number, number]> = { 3: [7, 5], 4: [10, 6], 5: [10, 6], 6: [12, 8], 8: [16, 8], 10: [20, 10], 12: [22, 12], 14: [25, 12], 15: [25, 12], 16: [28, 12], 18: [32, 14], 20: [32, 14], 22: [36, 14], 25: [40, 16], 30: [45, 16], 35: [56, 16], 40: [63, 18], 50: [80, 18] };
/** DIN 2093 disc springs, groups A and B: outside × inside × thickness, mm. */
const DISC: Record<string, [number, number, number][]> = {
  A: [[8, 4.2, 0.4], [10, 5.2, 0.5], [12.5, 6.2, 0.7], [14, 7.2, 0.8], [16, 8.2, 0.9], [18, 9.2, 1], [20, 10.2, 1.1], [22.5, 11.2, 1.25], [25, 12.2, 1.5], [28, 14.2, 1.5], [31.5, 16.3, 1.75], [35.5, 18.3, 2], [40, 20.4, 2.25], [45, 22.4, 2.5], [50, 25.4, 3]],
  B: [[8, 4.2, 0.3], [10, 5.2, 0.4], [12.5, 6.2, 0.5], [14, 7.2, 0.5], [16, 8.2, 0.6], [18, 9.2, 0.7], [20, 10.2, 0.8], [22.5, 11.2, 0.8], [25, 12.2, 0.9], [28, 14.2, 1], [31.5, 16.3, 1.25], [35.5, 18.3, 1.25], [40, 20.4, 1.5], [45, 22.4, 1.75], [50, 25.4, 2]],
};
/** Brushless outrunner stators (diameter and height in their name, mm) and the KVs each is wound to (typical). */
const BLDC: Record<string, number[]> = { '1104': [4000, 7500], '1306': [3100, 4000], '2204': [2300, 2600], '2207': [1750, 2550], '2306': [1700, 2450], '2806': [1300, 1700], '2814': [700, 1000], '3508': [380, 700], '4108': [380, 600], '5010': [280, 360], '6215': [170, 270] };
/** Gear motors: the motor's speed a volt (typical, unloaded), the ratios sold. */
const GM: Record<string, { d: number; L: number; rpmV: number; ratios: number[]; volts: number[] }> = {
  N20: { d: 12, L: 25, rpmV: 2500, ratios: [10, 30, 50, 100, 150, 210, 298, 1000], volts: [3, 6, 12] },
  JGA25: { d: 25, L: 55, rpmV: 550, ratios: [4.4, 9.6, 20.4, 34, 47, 75, 103, 171, 248], volts: [6, 12, 24] },
  '37GB': { d: 37, L: 65, rpmV: 600, ratios: [6.3, 10, 19, 30, 50, 90, 131, 270], volts: [12, 24] },
};

export const MOTION: KindDef[] = [
  {
    id: 'thrustbearing', name: 'thrust ball bearing', path: 'Mechanical/Bearings/Thrust bearings', says: 'two washers and a ring of balls between them, to carry a load along the shaft', std: 'ISO 104, the 511 series',
    axes: [bare('number', 'bearing number', Object.keys(T511))],
    title: (p) => { const [d, D, H] = T511[String(p.number)]!; return `thrust bearing ${p.number} (${d} × ${D} × ${H})`; }, of: () => 'steel-chrome bearing-cage grease', make: 'assemble', how: 'two ground chrome-steel washers with raceways, a caged row of balls between them',
    spec: (p) => { const [d, D, H] = T511[String(p.number)]!; return `${d} mm bore, ${D} mm outside, ${H} mm high (ISO 104); takes axial load only`; }, box: (p) => { const [, D, H] = T511[String(p.number)]!; return [D, D, H]; }, g: (p) => { const [d, D, H] = T511[String(p.number)]!; return gOf(ring(D, d, H) * 0.6, 7.83); },
  },
  {
    id: 'needlebearing', name: 'needle roller bearing, drawn cup', path: 'Mechanical/Bearings/Needle bearings', says: 'a thin drawn steel cup lined with needle rollers, pressed into a bore, running straight on a hardened shaft', std: 'ISO 3245, the HK series',
    axes: [bare('number', 'bearing number', Object.keys(HK)), bare('ends', 'ends', ['open', 'closed'])],
    title: (p) => { const [d, D, B] = HK[String(p.number)]!; return `needle bearing ${p.number}${p.ends === 'closed' ? ' closed end' : ''} (${d} × ${D} × ${B})`; }, of: () => 'steel-low steel-chrome bearing-cage grease', make: 'assemble', how: 'a cup drawn from strip and case-hardened, needles held in a cage inside it',
    spec: (p) => { const [d, D, B] = HK[String(p.number)]!; return `${d} mm shaft (hardened, ground), ${D} mm housing bore (N6 press fit), ${B} mm wide (ISO 3245)`; }, box: (p) => { const [, D, B] = HK[String(p.number)]!; return [D, D, B]; }, g: (p) => { const [d, D, B] = HK[String(p.number)]!; return gOf(ring(D, d, B) * 0.7, 7.85); },
  },
  {
    id: 'motorplate', name: 'NEMA motor plate', path: 'Mechanical/Motion/Motor mounts', says: 'a flat plate a stepper bolts to: its four clearance holes on the frame\'s square and its pilot bore, the motor\'s shaft through it',
    std: 'the NEMA ICS 16 face it takes; holes ISO 273 medium; plate 5 mm wider than the frame each way (typical)',
    axes: [tagged('nema', 'nema', 'frame', '', [17, 14, 23, 11, 8, 34]), ax('t', 'thickness', 'mm', [3, 4, 5, 6, 8, 10]), bare('matter', 'made of', ['aluminium', 'steel'])],
    title: (p) => `NEMA ${p.nema} motor plate, ${p.t} mm, ${madeOf(p)[2]}`, of: (p) => madeOf(p)[0], make: 'machine', alt: 'print', how: 'cut from plate, drilled and bored (or printed)',
    spec: (p) => { const f = NEMA_FACE[String(p.nema)]!; return `4 × ${f.thread} clearance on a ${f.holes} mm square, ${(f.pilot + 0.5).toFixed(1)} mm pilot bore`; },
    box: (p) => { const s = NEMA[String(p.nema)]! + 10; return [s, s, n(p, 't')]; },
    g: (p) => { const f = NEMA_FACE[String(p.nema)]!, s = NEMA[String(p.nema)]! + 10, hole = CLEAR[f.thread] ?? Number(f.thread.slice(1)) * 1.1; return gOf((s * s - Math.PI * ((f.pilot + 0.5) / 2) ** 2 - 4 * Math.PI * (hole / 2) ** 2) * n(p, 't'), madeOf(p)[1]); },
  },
  {
    id: 'flangebearing', name: 'flanged miniature ball bearing', path: 'Mechanical/Bearings/Ball bearings', says: 'a small ball bearing with a flange on its outer ring, so it locates itself in a plate', std: 'F6xx and F69x miniature series (makers\' tables)',
    axes: [bare('number', 'bearing number', Object.keys(FB)), bare('seal', 'shields or seals', ['ZZ', '2RS'])],
    title: (p) => { const [d, D, B] = FB[String(p.number)]!; return `flanged bearing ${p.number}${p.seal} (${d} × ${D} × ${B})`; }, of: (p) => `bearing-ring*2 bearing-ball*7 bearing-cage ${p.seal === '2RS' ? 'nbr*2' : 'bearing-shield*2'} grease`, make: 'assemble', how: 'a deep-groove bearing whose outer ring is turned with a flange',
    spec: (p) => { const [d, D, B, F] = FB[String(p.number)]!; return `${d} mm bore, ${D} mm outside, ${B} mm wide, flange ${F} mm`; }, box: (p) => { const [, , B, F] = FB[String(p.number)]!; return [F, F, B]; }, g: (p) => { const [d, D, B] = FB[String(p.number)]!; return gOf(ring(D, d, B) * 0.6, 7.83); },
  },
  {
    id: 'pillowblock', name: 'pillow block bearing', path: 'Mechanical/Bearings/Mounted bearings', says: 'a self-aligning insert bearing in a cast-iron housing that bolts down beside the shaft', std: 'UCP 201–210 (bores 12–50 mm), housings from makers\' tables (typical)',
    axes: [bare('size', 'size', Object.keys(UC))],
    title: (p) => `pillow block UCP${p.size} (${UC[String(p.size)]} mm bore)`, of: (p) => `cast-iron {bearing 62${String(p.size).slice(1)} 2RS|steel-chrome bearing-ball*10 bearing-cage} grease {setscrew M6x8}*2`, make: 'assemble', how: 'a UC insert (a ball bearing with a spherical outside and set screws) in a cast-iron block, greased through a nipple',
    spec: (p) => { const [H, L] = UCP[String(p.size)]!; return `${UC[String(p.size)]} mm shaft; centre ${H} mm above the base; ${L} mm long (typical)`; }, box: (p) => { const [H, L] = UCP[String(p.size)]!; return [L, H * 1.1, H * 2]; }, g: (p) => { const [H, L] = UCP[String(p.size)]!; return gOf(L * H * 1.1 * H * 2 * 0.22, 7.2); },
  },
  {
    id: 'flangeunit', name: 'four-bolt flange bearing', path: 'Mechanical/Bearings/Mounted bearings', says: 'a self-aligning insert bearing in a square cast-iron flange that bolts to a wall', std: 'UCF 201–210, flanges from makers\' tables (typical)',
    axes: [bare('size', 'size', Object.keys(UC))],
    title: (p) => `flange bearing UCF${p.size} (${UC[String(p.size)]} mm bore)`, of: (p) => `cast-iron {bearing 62${String(p.size).slice(1)} 2RS|steel-chrome bearing-ball*10 bearing-cage} grease {setscrew M6x8}*2`, make: 'assemble', how: 'a UC insert in a square cast-iron flange',
    spec: (p) => `${UC[String(p.size)]} mm shaft; square about ${(2.4 * UC[String(p.size)]! + 55).toFixed(0)} mm (typical)`, box: (p) => { const s = 2.4 * UC[String(p.size)]! + 55; return [s, s, UC[String(p.size)]! + 15]; }, g: (p) => { const s = 2.4 * UC[String(p.size)]! + 55; return gOf(s * s * (UC[String(p.size)]! + 15) * 0.25, 7.2); },
  },
  {
    id: 'plainbush', name: 'plain bush, PTFE-lined', path: 'Mechanical/Bearings/Plain bearings', says: 'a steel-backed bronze sleeve lined with PTFE: a bearing with no balls that needs no oil', std: 'ISO 3547 wrapped bushes, bores 3–50 mm',
    axes: [ax('d', 'bore', 'mm', Object.keys(DU).map(Number)), ax('L', 'length', 'mm', (p) => [3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50].filter((x) => x >= Math.max(3, n(p, 'd') * 0.5) && x <= Math.max(6, n(p, 'd') * 1.6))), bare('style', 'style', ['plain', 'flanged'])],
    title: (p) => `${p.style === 'flanged' ? 'flanged ' : ''}plain bush ${p.d} × ${DU[n(p, 'd')]} × ${p.L}`, of: () => 'steel-low bronze ptfe', make: 'roll', how: 'steel strip with sintered bronze and PTFE rolled on, cut and wrapped into a sleeve',
    spec: (p) => `${p.d} mm shaft (h8), ${DU[n(p, 'd')]} mm housing (H7), ${p.L} mm long (ISO 3547); runs dry`, box: (p) => [DU[n(p, 'd')]! + (p.style === 'flanged' ? 6 : 0), DU[n(p, 'd')]! + (p.style === 'flanged' ? 6 : 0), n(p, 'L')], g: (p) => gOf(ring(DU[n(p, 'd')]!, n(p, 'd'), n(p, 'L')), 7.9),
  },
  {
    id: 'rodend', name: 'rod end, spherical', path: 'Mechanical/Linkages/Rod ends', says: 'a ball with a bore held in an eye on a threaded shank: a joint that swivels every way', std: 'DIN ISO 12240-4 series K, bores 5–30 mm',
    axes: [ax('d', 'bore', 'mm', Object.keys(RODEND).map(Number)), bare('thread', 'shank', ['male', 'female']), bare('hand', 'thread hand', ['right', 'left'])],
    title: (p) => `rod end ${p.d} mm, ${p.thread} ${RODEND[n(p, 'd')]}${p.hand === 'left' ? ' left-hand' : ''}`, of: () => 'rodend-housing rodend-ball rodend-liner', make: 'assemble', alt: 'machine', how: 'a hardened ball swaged into a steel eye lined with PTFE fabric, the shank threaded',
    spec: (p) => `${p.d} mm bore H7; ${p.thread === 'male' ? 'external' : 'internal'} thread ${RODEND[n(p, 'd')]} ${p.hand}-hand; swivels about ±13° (typical)`, box: (p) => [2.6 * n(p, 'd') + 4, 0.8 * n(p, 'd') + 4, 4 * n(p, 'd') + 15], g: (p) => gOf(cyl(2.6 * n(p, 'd') + 4, 0.8 * n(p, 'd') + 4) * 0.8 + cyl(n(p, 'd') * 1.2, 2.5 * n(p, 'd')), 7.85),
  },
  {
    id: 'camfollower', name: 'cam follower', path: 'Mechanical/Bearings/Track rollers', says: 'a thick-ringed needle bearing on a threaded stud, to roll along a track or cam', std: 'the KR series (makers\' tables)',
    axes: [bare('size', 'size', Object.keys(KR))],
    title: (p) => `cam follower ${p.size}`, of: () => 'bearing-ring cam-stud needle-roller*16 bearing-cage grease', make: 'assemble', how: 'a hardened outer ring on needle rollers round a hardened stud', spec: (p) => { const [D, t] = KR[String(p.size)]!; return `${D} mm roller on an ${t} stud`; },
    box: (p) => { const [D] = KR[String(p.size)]!; return [D, D, D * 1.9]; }, g: (p) => { const [D] = KR[String(p.size)]!; return gOf(cyl(D, D * 0.5) + cyl(D * 0.4, D * 1.4), 7.85); },
  },
  {
    id: 'shaftsupport', name: 'shaft support', path: 'Mechanical/Linear motion/Shaft supports', says: 'an aluminium block that clamps the end of a linear shaft at a fixed height above its base', std: 'the SK series, shafts 8–30 mm (typical heights)',
    axes: [ax('d', 'shaft', 'mm', Object.keys(SK).map(Number))],
    title: (p) => `shaft support SK${p.d}`, of: () => 'al-6061 screw-m3', make: 'machine', alt: 'print', how: 'extruded aluminium cut, bored and slit, with a clamp screw', spec: (p) => { const [h, W] = SK[n(p, 'd')]!; return `${p.d} mm shaft at ${h} mm above the base; ${W} mm wide (typical)`; },
    box: (p) => { const [h, W] = SK[n(p, 'd')]!; return [W, 14, h * 1.6]; }, g: (p) => { const [h, W] = SK[n(p, 'd')]!; return gOf(W * 14 * h * 1.6 * 0.5, 2.7); },
  },
  {
    id: 'guiderail', name: 'profile rail guide, rail', path: 'Mechanical/Linear motion/Profile rails', says: 'a ground steel rail with four ball tracks, for a carriage that rides it stiffly', std: 'HG type, sizes 15–45; cut to any length',
    axes: [tagged('size', 'HG', 'size', '', Object.keys(HG).map(Number)), unit('L', 'length', 'mm', [300, 500, 800, 1000, 1500, 2000, 3000], [50, 4000, 1])],
    title: (p) => `profile rail HGR${p.size}, ${p.L} mm`, of: () => 'steel-alloy', make: 'grind', how: 'drawn bearing steel, induction-hardened, its tracks ground, drilled every 60 mm', spec: (p) => { const [w, h, kg] = HG[n(p, 'size')]!; return `${w} mm wide, ${h} mm high; ${kg} kg a metre`; },
    box: (p) => { const [w, h] = HG[n(p, 'size')]!; return [w, h, n(p, 'L')]; }, g: (p) => HG[n(p, 'size')]![2] * n(p, 'L'),
  },
  {
    id: 'guideblock', name: 'profile rail guide, carriage', path: 'Mechanical/Linear motion/Profile rails', says: 'the carriage that rides a profile rail on recirculating balls', std: 'HG type, sizes 15–45, with their basic dynamic loads',
    axes: [tagged('size', 'HG', 'size', '', Object.keys(HG).map(Number)), bare('style', 'block', ['narrow', 'flange'])],
    title: (p) => `${p.style} carriage HG${p.size}`, of: (p) => { const s = n(p, 'size'), ball = ({ 15: 3.175, 20: 3.969, 25: 4.763, 30: 5.556, 35: 6.35, 45: 7.938 } as Record<number, number>)[s]!; return `steel-alloy {bearingball d${ball} chrome}*${4 * Math.round((s * 4 * 0.85) / ball)} pom*2 grease nbr`; }, make: 'assemble', how: 'a hardened steel block with ground tracks, its balls turning round through plastic end caps', spec: (p) => `basic dynamic load C = ${HG[n(p, 'size')]![3]} kN: its life is (C / load)³ × 50 km`,
    box: (p) => { const s = n(p, 'size'); return [p.style === 'flange' ? s * 3.1 : s * 2.3, s * 1.9, s * 4]; }, g: (p) => { const s = n(p, 'size'); return gOf(s * 2.3 * s * 1.3 * s * 4 * 0.75, 7.85); },
  },
  {
    id: 'ballscrew', name: 'ball screw', path: 'Mechanical/Linear motion/Screws', says: 'a ground screw whose nut runs on recirculating balls: nine-tenths of the torque becomes push', std: 'the SFU sizes (diameter and lead in the name); cut and its ends machined to any length',
    axes: [bare('size', 'size', ['1204', '1605', '1610', '2005', '2010', '2505', '2510', '3205', '3210', '4005', '4010']), unit('L', 'length', 'mm', [300, 500, 800, 1000, 1500], [100, 4000, 1])],
    title: (p) => `ball screw SFU${p.size}, ${p.L} mm`, of: (p) => { const d = Number(String(p.size).slice(0, 2)), l = Number(String(p.size).slice(2)), ball = d <= 12 ? 2.381 : l >= 10 ? (d >= 25 ? 6.35 : 3.969) : 3.175; return `steel-alloy {bearingball d${ball} chrome}*${Math.round((3 * Math.PI * d) / ball)} steel-low grease`; }, make: 'grind', how: 'rolled or ground on bearing steel, hardened; a flanged nut with its balls and return tubes',
    spec: (p) => { const d = Number(String(p.size).slice(0, 2)), l = Number(String(p.size).slice(2)); return `${d} mm, lead ${l} mm a turn; torque to push F is F × ${l} mm / (2π × 0.9) (efficiency about 0.9, typical)`; },
    box: (p) => { const d = Number(String(p.size).slice(0, 2)); return [d * 3.4, d * 3.4, n(p, 'L')]; }, g: (p) => { const d = Number(String(p.size).slice(0, 2)); return gOf(cyl(d * 0.92, n(p, 'L')) + cyl(d * 2, d * 3), 7.85); },
  },
  {
    id: 'vbelt', name: 'V-belt', path: 'Mechanical/Power transmission/V-belts', says: 'an endless rubber belt of trapezoidal section, wedged into its pulley\'s groove so it grips by its sides', std: 'ISO 4184 classical and narrow sections, in the R20 datum lengths',
    axes: [bare('section', 'section', Object.keys(VB)), unit('L', 'datum length', 'mm', VLEN)],
    title: (p) => `V-belt ${p.section} ${p.L}`, of: () => 'rubber pet', make: 'mould', how: 'polyester cords wound in rubber, wrapped in a fabric cover and vulcanised in a ring mould',
    spec: (p) => { const [w, h] = VB[String(p.section)]!; return `${w} × ${h} mm section; ${p.L} mm round its pitch line (ISO 4184)`; }, box: (p) => [n(p, 'L') / Math.PI, n(p, 'L') / Math.PI, VB[String(p.section)]![0]], g: (p) => VB[String(p.section)]![2] * n(p, 'L'),
  },
  {
    id: 'vpulley', name: 'V-belt pulley', path: 'Mechanical/Power transmission/V-belts', says: 'a grooved pulley for V-belts', std: 'ISO 4183 grooves, pitch diameters in the R20 series',
    axes: [bare('section', 'section', ['SPZ', 'SPA', 'SPB', 'Z', 'A', 'B']), unit('pd', 'pitch diameter', 'mm', (p) => [50, 56, 63, 71, 80, 90, 100, 112, 125, 140, 160, 180, 200, 224, 250, 280, 315, 355, 400].filter((d) => d >= ({ SPZ: 63, SPA: 90, SPB: 140, Z: 50, A: 75, B: 125 } as Record<string, number>)[String(p.section)]!)), ax('g', 'grooves', '', [1, 2, 3])],
    title: (p) => `V-pulley ${p.section}, ${p.pd} mm, ${p.g} groove${n(p, 'g') > 1 ? 's' : ''}`, of: () => 'cast-iron', make: 'cast', alt: 'machine', how: 'cast in grey iron, its grooves and pilot bore turned', spec: (p) => `${p.pd} mm on the pitch line; speed ratio to another is the ratio of pitch diameters`,
    box: (p) => [n(p, 'pd') + 8, n(p, 'pd') + 8, n(p, 'g') * VB[String(p.section)]![0] * 1.25 + 8], g: (p) => gOf(cyl(n(p, 'pd'), n(p, 'g') * VB[String(p.section)]![0] * 1.25 + 8) * 0.45, 7.2),
  },
  {
    id: 'htdbelt', name: 'HTD timing belt', path: 'Mechanical/Power transmission/Timing belts', says: 'a closed toothed belt with round-topped teeth, for drive that cannot slip', std: 'HTD 3M, 5M, 8M and 14M, the widths sold, every fifth tooth count (makers stock most)',
    axes: [bare('pitch', 'pitch', Object.keys(HTD)), ax('w', 'width', 'mm', (p) => HTD[String(p.pitch)]![0]), ax('z', 'teeth', '', (p) => range(String(p.pitch) === '14M' ? 60 : 40, String(p.pitch) === '3M' ? 400 : 300, 5))],
    title: (p) => `HTD ${p.pitch} belt, ${n(p, 'z') * Number(String(p.pitch).replace('M', ''))} mm, ${p.w} mm wide`, of: () => 'neoprene fibreglass nylon', make: 'mould', how: 'glass-fibre cords and neoprene moulded with its teeth, faced with nylon',
    spec: (p) => `${p.z} teeth at ${String(p.pitch).replace('M', '')} mm: ${n(p, 'z') * Number(String(p.pitch).replace('M', ''))} mm round its pitch line`, box: (p) => { const L = n(p, 'z') * Number(String(p.pitch).replace('M', '')); return [L / Math.PI, L / Math.PI, n(p, 'w')]; }, g: (p) => n(p, 'z') * Number(String(p.pitch).replace('M', '')) * n(p, 'w') * Number(String(p.pitch).replace('M', '')) * 0.00045,
  },
  {
    id: 'htdpulley', name: 'HTD timing pulley', path: 'Mechanical/Power transmission/Timing belts', says: 'a toothed pulley for an HTD belt', std: 'HTD 3M, 5M and 8M, 12–72 teeth',
    axes: [bare('pitch', 'pitch', ['3M', '5M', '8M']), ax('z', 'teeth', '', [12, 14, 15, 16, 18, 20, 22, 24, 25, 26, 28, 30, 32, 34, 36, 40, 44, 48, 50, 56, 60, 64, 72]), ax('w', 'for belt width', 'mm', (p) => HTD[String(p.pitch)]![0]), bare('matter', 'made of', ['aluminium', 'steel'])],
    title: (p) => `HTD ${p.pitch} pulley, ${p.z} teeth, for ${p.w} mm belt`, of: (p) => madeOf(p)[0], make: 'machine', alt: 'print', how: 'its teeth hobbed in bar, flanged, pilot-bored',
    spec: (p) => { const pt = Number(String(p.pitch).replace('M', '')), pd = (n(p, 'z') * pt) / Math.PI, a = HTD[String(p.pitch)]![1]; return `pitch diameter ${pd.toFixed(2)} mm, outside ${(pd - 2 * a).toFixed(2)} mm; ${n(p, 'z') * pt} mm of belt a turn`; },
    box: (p) => { const pd = (n(p, 'z') * Number(String(p.pitch).replace('M', ''))) / Math.PI; return [pd + 6, pd + 6, n(p, 'w') + 10]; }, g: (p) => { const pd = (n(p, 'z') * Number(String(p.pitch).replace('M', ''))) / Math.PI; return gOf(cyl(pd, n(p, 'w') + 10) * 0.6, madeOf(p)[1]); },
  },
  {
    id: 'idler', name: 'GT2 idler pulley', path: 'Mechanical/Linear motion/Belts and pulleys', says: 'a free-turning pulley on a bearing, to guide or tension a GT2 belt', std: 'the bores, tooth counts and widths sold (typical)',
    axes: [ax('bore', 'bore', 'mm', [3, 5]), bare('face', 'face', ['smooth', '16t', '20t']), ax('w', 'for belt width', 'mm', [6, 10])],
    title: (p) => `GT2 idler, ${p.face === 'smooth' ? 'smooth' : `${String(p.face).replace('t', '')} teeth`}, ${p.bore} mm bore, ${p.w} mm belt`, of: () => 'al-6061 bearing-ring*2 bearing-ball*7', make: 'assemble', how: 'a turned aluminium pulley pressed onto two small bearings', spec: (p) => `${p.bore} mm bore on ${p.bore === 3 ? 'MR63' : '625'}-size bearings`,
    box: (p) => [18, 18, n(p, 'w') + 3], g: (p) => gOf(cyl(18, n(p, 'w') + 3) * 0.55, 2.7) + 3,
  },
  {
    id: 'rack', name: 'gear rack', path: 'Mechanical/Gears and gearboxes/Racks', says: 'a straight bar of gear teeth: a pinion turning on it runs along it', std: 'modules of ISO 54 0.5–5, in the lengths sold or cut to any',
    axes: [ax('m', 'module', 'mm', MODS), bare('matter', 'made of', ['steel', 'nylon', 'pom', 'brass']), unit('L', 'length', 'mm', [250, 500, 1000, 1500, 2000], [20, 3000, 1])],
    title: (p) => `gear rack m${p.m}, ${madeOf(p)[2]}, ${p.L} mm`, of: (p) => madeOf(p)[0], make: (p) => (p.matter === 'steel' || p.matter === 'brass' ? 'machine' : 'mould'), alt: 'print', how: 'its teeth cut on bar (or moulded, in plastic)',
    spec: (p) => `${(Math.PI * n(p, 'm')).toFixed(3)} mm between teeth; a pinion of z teeth moves it π × ${p.m} × z mm a turn; section about ${Math.max(8, 10 * n(p, 'm'))} × ${Math.max(8, 10 * n(p, 'm'))} mm (typical)`, box: (p) => [Math.max(8, 10 * n(p, 'm')), Math.max(8, 10 * n(p, 'm')), n(p, 'L')], g: (p) => gOf(Math.max(8, 10 * n(p, 'm')) ** 2 * n(p, 'L') * 0.92, madeOf(p)[1]),
  },
  {
    id: 'wormset', name: 'worm and worm wheel', path: 'Mechanical/Gears and gearboxes/Worm gears', says: 'a screw-like worm turning a toothed wheel at right angles: a big reduction in one pair, often self-locking', std: 'modules 0.5–3, single-start, wheel teeth = ratio (typical)',
    axes: [ax('m', 'module', 'mm', [0.5, 0.8, 1, 1.25, 1.5, 2, 2.5, 3]), unit('i', 'ratio', ':1', [10, 15, 20, 25, 30, 40, 50, 60]), bare('matter', 'made of', ['bronze', 'nylon'])],
    title: (p) => `worm set m${p.m}, ${p.i}:1, steel worm, ${madeOf(p)[2]} wheel`, of: (p) => `steel-alloy ${madeOf(p)[0]}`, make: 'machine', alt: 'print', how: 'the worm cut on hardened steel, the wheel hobbed in bronze (or moulded in nylon)',
    spec: (p) => { const m = n(p, 'm'), z = n(p, 'i'), q = 10, gam = Math.atan(1 / q) * 180 / Math.PI; return `wheel ${z} teeth, pitch circle ${(m * z).toFixed(1)} mm; worm about ${(q * m).toFixed(1)} mm (q = 10, typical); centres ${(m * (z + q) / 2).toFixed(1)} mm; lead angle ${gam.toFixed(1)}°: ${gam < 5 ? 'self-locking' : 'near self-locking: it may back-drive under vibration'}`; },
    box: (p) => [n(p, 'm') * (n(p, 'i') + 2), n(p, 'm') * (n(p, 'i') + 2), n(p, 'm') * 10 + 10], g: (p) => gOf(cyl(n(p, 'm') * n(p, 'i'), n(p, 'm') * 8) * 0.8 + cyl(10 * n(p, 'm'), 25 * n(p, 'm')), madeOf(p)[1]),
  },
  {
    id: 'bevelgear', name: 'bevel gear pair', path: 'Mechanical/Gears and gearboxes/Bevel gears', says: 'two cone-shaped gears that turn a drive through a right angle', std: 'modules 0.5–3, the ratios sold (typical)',
    axes: [ax('m', 'module', 'mm', [0.5, 0.8, 1, 1.5, 2, 2.5, 3]), unit('i', 'ratio', ':1', [1, 1.5, 2, 3]), ax('z', 'pinion teeth', '', [15, 20, 25, 30]), bare('matter', 'made of', ['steel', 'brass', 'pom'])],
    title: (p) => `bevel gear pair m${p.m}, ${p.z}:${n(p, 'z') * n(p, 'i')}, ${madeOf(p)[2]}`, of: (p) => `${madeOf(p)[0]}*2`, make: 'machine', alt: 'print', how: 'cut on a gear planer (or moulded, in POM), as a matched pair', spec: (p) => `pinion ${p.z}, gear ${n(p, 'z') * n(p, 'i')} teeth; pitch circles ${(n(p, 'm') * n(p, 'z')).toFixed(1)} and ${(n(p, 'm') * n(p, 'z') * n(p, 'i')).toFixed(1)} mm; shafts at 90°`,
    box: (p) => { const D = n(p, 'm') * n(p, 'z') * n(p, 'i'); return [D, D, D * 0.6]; }, g: (p) => gOf(cyl(n(p, 'm') * n(p, 'z'), n(p, 'm') * 6) * 0.6 + cyl(n(p, 'm') * n(p, 'z') * n(p, 'i'), n(p, 'm') * 6) * 0.6, madeOf(p)[1]),
  },
  {
    id: 'helicalgear', name: 'helical gear', path: 'Mechanical/Gears and gearboxes/Helical gears', says: 'a gear whose teeth run at an angle, so they mesh gradually and quietly, with an end thrust', std: 'normal modules 1–3, helix 15° or 30°, either hand',
    axes: [ax('m', 'normal module', 'mm', [1, 1.5, 2, 2.5, 3]), ax('z', 'teeth', '', [12, 15, 18, 20, 24, 25, 30, 36, 40, 45, 50, 60, 72, 80]), ax('b', 'helix angle', '°', [15, 30]), bare('hand', 'hand', ['left', 'right'])],
    title: (p) => `helical gear m${p.m}, ${p.z} teeth, ${p.b}° ${p.hand}-hand`, of: () => 'steel-alloy', make: 'machine', how: 'hobbed in alloy steel at its helix angle, hardened', spec: (p) => { const d = (n(p, 'm') * n(p, 'z')) / Math.cos((n(p, 'b') * Math.PI) / 180); return `pitch circle ${d.toFixed(2)} mm (mₙ z / cos β); meshes with a ${p.hand === 'left' ? 'right' : 'left'}-hand gear of the same module and angle`; },
    box: (p) => { const d = (n(p, 'm') * n(p, 'z')) / Math.cos((n(p, 'b') * Math.PI) / 180) + 2 * n(p, 'm'); return [d, d, 10 * n(p, 'm')]; }, g: (p) => { const d = (n(p, 'm') * n(p, 'z')) / Math.cos((n(p, 'b') * Math.PI) / 180); return gOf(cyl(d, 10 * n(p, 'm')) * 0.9, 7.85); },
  },
  {
    id: 'ringgear', name: 'internal gear (ring gear)', path: 'Mechanical/Gears and gearboxes/Internal gears', says: 'a ring with its teeth inside: the outer gear of a planetary set', std: 'modules 0.5–2, 40–120 teeth (typical)',
    axes: [ax('m', 'module', 'mm', [0.5, 0.8, 1, 1.5, 2]), ax('z', 'teeth', '', [40, 48, 50, 60, 64, 72, 80, 90, 100, 120]), bare('matter', 'made of', ['steel', 'pom'])],
    title: (p) => `internal gear m${p.m}, ${p.z} teeth, ${madeOf(p)[2]}`, of: (p) => madeOf(p)[0], make: (p) => (p.matter === 'pom' ? 'mould' : 'machine'), alt: 'print', how: 'shaped (or moulded) with its teeth inside the ring', spec: (p) => `pitch circle ${(n(p, 'm') * n(p, 'z')).toFixed(1)} mm; with a sun of s teeth its planets have (${p.z} − s)/2`,
    box: (p) => { const D = n(p, 'm') * n(p, 'z') + 12 * n(p, 'm') + 6; return [D, D, 8 * n(p, 'm') + 4]; }, g: (p) => gOf(ring(n(p, 'm') * n(p, 'z') + 12 * n(p, 'm') + 6, n(p, 'm') * n(p, 'z'), 8 * n(p, 'm') + 4), madeOf(p)[1]),
  },
  {
    id: 'jawcoupling', name: 'jaw coupling', path: 'Mechanical/Shafts and hubs/Couplings', says: 'two hubs with interlocking jaws and an elastomer spider between: it damps shock and takes a little misalignment', std: 'the L-series sizes; bores up to each size\'s maximum (typical; ratings from makers\' tables, about)',
    axes: [bare('size', 'size', ['L050', 'L070', 'L075', 'L090', 'L095', 'L100', 'L110']), ax('d', 'bore', 'mm', (p) => [6, 8, 10, 12, 14, 15, 16, 19, 20, 22, 24, 25, 28, 30, 35, 38, 40, 42].filter((b) => b <= ({ L050: 16, L070: 19, L075: 22, L090: 25, L095: 28, L100: 35, L110: 42 } as Record<string, number>)[String(p.size)]!)), bare('spider', 'spider', ['nbr', 'pu'])],
    title: (p) => `jaw coupling ${p.size}, ${p.d} mm bores, ${p.spider === 'nbr' ? 'NBR' : 'urethane'} spider`, of: (p) => `cast-iron*2 ${p.spider === 'nbr' ? 'nbr' : 'pu'} {setscrew ${['L050', 'L070', 'L075'].includes(String(p.size)) ? 'M4x6' : ['L090', 'L095'].includes(String(p.size)) ? 'M5x8' : 'M6x10'}}*2`, make: 'assemble', alt: 'machine', how: 'two sintered or cast hubs with three jaws each, bored and keyed; a moulded spider between',
    spec: (p) => { const T: Record<string, number> = { L050: 2.9, L070: 4.9, L075: 10.2, L090: 16.3, L095: 21.6, L100: 47, L110: 94 }; return `about ${T[String(p.size)]} N·m with an NBR spider (urethane carries about 1.5 ×); ${p.d} mm bores`; },
    box: (p) => { const D = ({ L050: 27.5, L070: 35, L075: 45, L090: 53.5, L095: 53.5, L100: 65, L110: 84 } as Record<string, number>)[String(p.size)]!; return [D, D, D * 1.6]; }, g: (p) => { const D = ({ L050: 27.5, L070: 35, L075: 45, L090: 53.5, L095: 53.5, L100: 65, L110: 84 } as Record<string, number>)[String(p.size)]!; return gOf(cyl(D, D * 1.6) * 0.6, 7.2); },
  },
  {
    id: 'rigidcoupling', name: 'clamp coupling, rigid or flexible', path: 'Mechanical/Shafts and hubs/Couplings', says: 'a coupling that clamps two shafts: rigid, Oldham (a sliding middle disc for offset) or bellows (stiff in twist, soft in bending)', std: 'the bores sold, 3–20 mm (typical)',
    axes: [bare('style', 'style', ['rigid', 'oldham', 'bellows']), ax('d1', 'first bore', 'mm', [3, 4, 5, 6, 6.35, 8, 10, 12, 14, 15, 16, 20]), ax('d2', 'second bore', 'mm', [3, 4, 5, 6, 6.35, 8, 10, 12, 14, 15, 16, 20])],
    title: (p) => `${p.style} coupling ${p.d1} × ${p.d2} mm`, of: (p) => `${p.style === 'oldham' ? 'al-6061*2 pom' : p.style === 'bellows' ? 'al-6061*2 stainless-304' : 'al-6061'} {screw ${Math.max(n(p, 'd1'), n(p, 'd2')) >= 10 ? 'M4x12' : 'M3x10'}}*${p.style === 'rigid' ? 4 : 2}`, make: 'machine', alt: 'print', how: (p) => (p.style === 'oldham' ? 'two turned aluminium hubs with slots, an acetal disc between' : p.style === 'bellows' ? 'two clamp hubs welded to a thin stainless bellows' : 'one aluminium sleeve with two clamping slits'),
    spec: (p) => `${p.d1} and ${p.d2} mm bores; ${p.style === 'rigid' ? 'takes no misalignment' : p.style === 'oldham' ? 'takes about 0.5 mm offset (typical)' : 'takes about 1–2° and 0.2 mm offset, no backlash (typical)'}`, box: (p) => { const D = Math.max(16, 2.5 * Math.max(n(p, 'd1'), n(p, 'd2')) + 6); return [D, D, D * 1.3]; }, g: (p) => { const D = Math.max(16, 2.5 * Math.max(n(p, 'd1'), n(p, 'd2')) + 6); return gOf(cyl(D, D * 1.3) * 0.65, 2.7); },
  },
  {
    id: 'collar', name: 'shaft collar', path: 'Mechanical/Shafts and hubs/Collars', says: 'a ring fixed on a shaft to locate something along it: by a set screw, or clamped by a split', std: 'DIN 705 sizes, bores 3–50 mm',
    axes: [ax('d', 'bore', 'mm', Object.keys(COLLAR).map(Number)), bare('style', 'style', ['setscrew', 'clamp']), bare('matter', 'made of', ['steel', 'stainless', 'aluminium'])],
    title: (p) => `shaft collar ${p.d} mm, ${p.style === 'setscrew' ? 'set screw' : 'clamp'}, ${madeOf(p)[2]}`, of: (p) => { const d = n(p, 'd'); return `${madeOf(p)[0]} {${p.style === 'clamp' ? `screw ${d < 10 ? 'M3x10' : d < 25 ? 'M4x12' : 'M5x16'}` : `setscrew ${d < 10 ? 'M3x4' : d < 20 ? 'M4x6' : d < 35 ? 'M5x8' : 'M6x10'}`}}`; }, make: 'machine', how: (p) => (p.style === 'clamp' ? 'turned, slit and drilled for a clamp screw' : 'turned and drilled for a set screw'), spec: (p) => { const [D, B] = COLLAR[n(p, 'd')]!; return `${p.d} × ${D} × ${B} mm (DIN 705)`; },
    box: (p) => { const [D, B] = COLLAR[n(p, 'd')]!; return [D, D, B]; }, g: (p) => { const [D, B] = COLLAR[n(p, 'd')]!; return gOf(ring(D, n(p, 'd'), B), madeOf(p)[1]); },
  },
  {
    id: 'extspring', name: 'extension spring', path: 'Mechanical/Springs/Extension', says: 'a close-wound spring with a hook at each end that pulls back when stretched', std: 'a grid of the wires, diameters and lengths makers stock (typical); or made to order: any music wire 0.2–6 mm every 0.05 mm, any outside diameter 5 to 16 wires every 0.1 mm, any length inside its hooks to 500 mm, three kinds of hook',
    axes: [ax('d', 'wire', 'mm', [0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.2, 1.5, 2, 2.5, 3], [0.2, 6, 0.05]), ax('D', 'outside diameter', 'mm', (p) => [3, 4, 5, 6, 8, 10, 12, 16, 20, 25, 30].filter((x) => x / n(p, 'd') >= 5 && x / n(p, 'd') <= 16), [1, 96, 0.1]), ax('L', 'length inside the hooks', 'mm', (p) => [15, 20, 25, 30, 40, 50, 60, 80, 100, 150].filter((L) => L >= 2 * (n(p, 'D') - n(p, 'd')) + 3 * n(p, 'd')), [5, 500, 1]), bare('hook', 'hooks', ['machine', 'crossover', 'extended'])],
    title: (p) => `extension spring ${p.d} × ${p.D} × ${p.L} mm${p.hook === 'machine' ? '' : `, ${p.hook} hooks`}`, of: () => 'steel-spring', make: 'coil', how: (p) => `music wire wound close with an initial tension, its end coils bent up into ${p.hook === 'machine' ? 'machine hooks (a half coil turned up)' : p.hook === 'crossover' ? 'crossover hooks (bent across its middle)' : 'extended hooks (on a straight length of wire)'}, stress-relieved`,
    ok: (p) => { const r = n(p, 'D') / n(p, 'd'), min = 2 * (n(p, 'D') - n(p, 'd')) + 3 * n(p, 'd'); return r < 5 || r > 16 ? `${p.D} mm outside on ${p.d} mm wire is ${r.toFixed(1)} wires across: makers wind 5 to 16.` : n(p, 'L') < min ? `inside its hooks it needs at least ${min.toFixed(0)} mm: two hooks and a few coils.` : null; },
    space: () => range(0.2, 6, 0.05).map((d) => ({ fixed: { d }, axes: [{ key: 'D', lo: Math.ceil(5 * d * 10) / 10, hi: Math.min(96, Math.floor(16 * d * 10) / 10), step: 0.1 }, { key: 'L', lo: Math.max(5, Math.ceil(2 * (16 * d - d) + 3 * d)), hi: 500, step: 1 }, { key: 'hook', values: ['machine', 'crossover', 'extended'] }] })).filter((b) => b.axes[0]!.lo! <= b.axes[0]!.hi! && b.axes[1]!.lo! <= 500),
    spec: (p) => { const d = n(p, 'd'), Dm = n(p, 'D') - d, body = n(p, 'L') - 2 * Dm, N = Math.max(2, body / d - 1), k = (79300 * d ** 4) / (8 * Dm ** 3 * N); return `about ${N.toFixed(0)} coils; rate ${k.toFixed(3)} N/mm (G = 79.3 GPa); it pulls a little before it stretches (its initial tension)`; },
    box: (p) => [n(p, 'D'), n(p, 'D'), n(p, 'L')], g: (p) => { const d = n(p, 'd'), Dm = n(p, 'D') - d; return gOf(cyl(d, Math.PI * Dm * (n(p, 'L') / d)), 7.85); },
  },
  {
    id: 'torsionspring', name: 'torsion spring', path: 'Mechanical/Springs/Torsion', says: 'a coiled spring with two straight legs, twisted to push back round its axis', std: 'a grid of the wires, coil diameters, coils and leg angles makers stock, legs 25 mm (typical); or made to order: any music wire 0.2–6 mm every 0.05 mm, any mean diameter 4 to 16 wires every 0.1 mm, 2–40 body coils every quarter turn, legs at any angle every 5°, each leg any length 5–200 mm, wound either hand',
    axes: [ax('d', 'wire', 'mm', [0.5, 0.6, 0.8, 1, 1.2, 1.5, 2, 2.5, 3], [0.2, 6, 0.05]), ax('D', 'mean coil diameter', 'mm', (p) => [4, 5, 6, 8, 10, 12, 15, 20, 25, 30].filter((x) => x / n(p, 'd') >= 4 && x / n(p, 'd') <= 16), [0.8, 96, 0.1]), ax('n', 'body coils', '', [2.25, 3.25, 4.25, 5.25, 6.25, 8.25, 10.25], [2, 40, 0.25]), ax('a', 'leg angle', '°', [90, 180, 270], [0, 355, 5]), bare('wind', 'wound', ['left', 'right']), ax('l1', 'first leg', 'mm', [25], [5, 200, 1]), ax('l2', 'second leg', 'mm', [25], [5, 200, 1])],
    title: (p) => `torsion spring ${p.d} × ${p.D}, ${p.n} coils, legs at ${p.a}°, ${p.wind}-hand${n(p, 'l1') === 25 && n(p, 'l2') === 25 ? '' : `, legs ${p.l1} and ${p.l2} mm`}`, of: () => 'steel-spring', make: 'coil', how: 'music wire coiled, its legs formed, stress-relieved',
    ok: (p) => { const r = n(p, 'D') / n(p, 'd'); return r < 4 || r > 16 ? `a ${p.D} mm coil on ${p.d} mm wire is ${r.toFixed(1)} wires across: makers wind 4 to 16.` : null; },
    space: () => range(0.2, 6, 0.05).map((d) => ({ fixed: { d }, axes: [{ key: 'D', lo: Math.ceil(4 * d * 10) / 10, hi: Math.min(96, Math.floor(16 * d * 10) / 10), step: 0.1 }, { key: 'n', lo: 2, hi: 40, step: 0.25 }, { key: 'a', lo: 0, hi: 355, step: 5 }, { key: 'wind', values: ['left', 'right'] }, { key: 'l1', lo: 5, hi: 200, step: 1 }, { key: 'l2', lo: 5, hi: 200, step: 1 }] })),
    spec: (p) => { const d = n(p, 'd'), D = n(p, 'D'), N = n(p, 'n'), kt = (d ** 4 * 203400) / (10.8 * D * N); return `rate ${(kt / 1000).toFixed(4)} N·m a turn (k = d⁴E / 10.8 D N, E = 203.4 GPa, Shigley); wind it to close its coils`; },
    box: (p) => [n(p, 'D') + n(p, 'd') + Math.max(n(p, 'l1'), n(p, 'l2')), n(p, 'D') + n(p, 'd'), n(p, 'd') * (n(p, 'n') + 1)], g: (p) => gOf(cyl(n(p, 'd'), Math.PI * n(p, 'D') * n(p, 'n') + n(p, 'l1') + n(p, 'l2')), 7.85),
  },
  {
    id: 'discspring', name: 'disc spring (Belleville washer)', path: 'Mechanical/Springs/Disc springs', says: 'a coned washer that flattens under great force over a short travel; stacked to tune it', std: 'DIN 2093 groups A and B, 8–50 mm',
    axes: [bare('group', 'series', ['A', 'B']), bare('size', 'outside × inside × thick', (p) => DISC[String(p.group)]!.map(([D, d, t]) => `${D}x${d}x${t}`))],
    title: (p) => `disc spring ${String(p.size).replace(/x/g, ' × ')}, series ${p.group}`, of: () => 'steel-spring', make: 'stamp', how: 'blanked from spring strip, coned, hardened and tempered',
    spec: (p) => { const [, , t] = String(p.size).split('x').map(Number) as [number, number, number], h0 = (p.group === 'A' ? 0.4 : 0.75) * t; return `free height about ${(t + h0).toFixed(2)} mm (cone ${h0.toFixed(2)} mm, DIN 2093 ${p.group}); flat at full deflection`; },
    box: (p) => { const [D, , t] = String(p.size).split('x').map(Number) as [number, number, number]; return [D, D, t * (p.group === 'A' ? 1.4 : 1.75)]; }, g: (p) => { const [D, d, t] = String(p.size).split('x').map(Number) as [number, number, number]; return gOf(ring(D, d, t), 7.85); },
  },
  {
    id: 'gasstrut', name: 'gas spring', path: 'Mechanical/Springs/Gas springs', says: 'a sealed cylinder of nitrogen that pushes its rod out with a nearly steady force: lids, hatches, chairs', std: 'the rod/body sizes, strokes and forces sold (typical)',
    axes: [bare('size', 'rod/body', ['6/15', '8/18', '10/22', '14/28']), unit('s', 'stroke', 'mm', (p) => pref(20, ({ '6/15': 150, '8/18': 250, '10/22': 400, '14/28': 500 } as Record<string, number>)[String(p.size)]!)), unit('F', 'force', 'N', (p) => [50, 80, 100, 150, 200, 250, 300, 400, 500, 600, 800, 1000, 1200, 1500, 2000].filter((f) => f >= ({ '6/15': 20, '8/18': 50, '10/22': 100, '14/28': 400 } as Record<string, number>)[String(p.size)]! && f <= ({ '6/15': 400, '8/18': 800, '10/22': 1200, '14/28': 2500 } as Record<string, number>)[String(p.size)]!))],
    title: (p) => `gas spring ${p.size} mm, ${p.s} mm stroke, ${p.F} N`, of: (p) => { const [r, b] = String(p.size).split('/').map(Number) as [number, number], s = n(p, 's'); return `{tube round ${b}x1 ${s + 2 * b} steel} {rod ${r}mm ${s + b} steel} {oring ${r}x2 nbr} nitrogen oil`; }, make: 'assemble', how: 'a chromed rod and piston in a welded steel tube charged with nitrogen and a little oil, sealed',
    spec: (p) => { const s = n(p, 's'), [r, b] = String(p.size).split('/').map(Number) as [number, number]; return `${p.F} N at full extension, about ${(n(p, 'F') * 1.3).toFixed(0)} N pushed in (progression about 1.3, typical); extended about ${2 * s + 4 * b} mm; rod ${r} mm`; },
    box: (p) => { const b = Number(String(p.size).split('/')[1]); return [b, b, 2 * n(p, 's') + 4 * b]; }, g: (p) => { const [r, b] = String(p.size).split('/').map(Number) as [number, number]; return gOf(ring(b, b - 2.5, n(p, 's') + 2 * b) + cyl(r, n(p, 's') + b), 7.85); },
  },
  {
    id: 'outrunner', name: 'brushless outrunner motor', path: 'Electrical/Motors and actuators/Brushless motors', says: 'a brushless motor whose magnet bell spins round its wound stator: drones, planes, gimbals', std: 'stator sizes (diameter and height in the name) and the KVs each is wound to (typical)',
    axes: [bare('stator', 'stator', Object.keys(BLDC)), ax('kv', 'KV (rpm a volt)', 'rpm/V', (p) => BLDC[String(p.stator)]!)],
    title: (p) => `brushless motor ${p.stator}, ${p.kv} KV`, of: () => 'lamination-stack winding magnet-ndfeb al-6061 bearing-ring*4 bearing-ball*14 shaft-steel', make: 'assemble', how: 'a laminated stator wound in three phases, a bell lined with neodymium magnets on two bearings',
    spec: (p) => { const kv = n(p, 'kv'); return `${kv} rpm a volt unloaded; torque constant ${(60 / (2 * Math.PI * kv) * 1000).toFixed(2)} mN·m an amp (Kt = 60 / 2π KV); three wires to an ESC`; },
    box: (p) => { const d = Number(String(p.stator).slice(0, 2)), h = Number(String(p.stator).slice(2)); return [d * 1.25, d * 1.25, h * 2.2 + 6]; }, g: (p) => { const d = Number(String(p.stator).slice(0, 2)), h = Number(String(p.stator).slice(2)); return gOf(cyl(d * 1.25, h * 2.2 + 6) * 0.42, 7.5); },
  },
  {
    id: 'gearmotor', name: 'DC gear motor', path: 'Electrical/Motors and actuators/Gear motors', says: 'a small brushed motor with a spur gearbox on its face: slow and strong', std: 'N20, 25 mm and 37 mm frames, the ratios and voltages sold (speeds typical)',
    axes: [bare('frame', 'frame', Object.keys(GM)), unit('i', 'ratio', ':1', (p) => GM[String(p.frame)]!.ratios), unit('V', 'voltage', 'V', (p) => GM[String(p.frame)]!.volts)],
    title: (p) => `${p.frame} gear motor, ${p.i}:1, ${p.V} V`, of: (p) => `${p.frame === 'N20' ? 'n20-motor' : 'motor-130'} gearbox-housing gear-small*4 shaft-steel`, make: 'assemble', how: 'a brushed DC motor driving a stack of spur gears in a metal gearbox',
    spec: (p) => { const g = GM[String(p.frame)]!, rpm = (g.rpmV * n(p, 'V')) / n(p, 'i'); return `about ${rpm.toFixed(0)} rpm unloaded (motor about ${g.rpmV} rpm a volt, typical, divided by the ratio); torque the ratio times the motor's, less the gears' losses`; },
    box: (p) => { const g = GM[String(p.frame)]!; return [g.d, g.d, g.L]; }, g: (p) => { const g = GM[String(p.frame)]!; return gOf(cyl(g.d, g.L) * 0.45, 7.5); },
  },
  {
    id: 'linactuator', name: 'linear actuator', path: 'Electrical/Motors and actuators/Linear actuators', says: 'a motor, gearbox and lead screw in a tube that pushes a rod in and out, stopping itself at each end', std: 'the strokes, forces and voltages sold (speeds typical)',
    axes: [unit('s', 'stroke', 'mm', [50, 100, 150, 200, 250, 300, 400, 500]), unit('F', 'force', 'N', [200, 500, 750, 1000, 1500]), unit('V', 'voltage', 'V', [12, 24])],
    title: (p) => `linear actuator ${p.s} mm, ${p.F} N, ${p.V} V`, of: () => 'motor-130 gearbox-housing gear-small*3 lead-screw-t8 al-6063 micro-switch*2', make: 'assemble', how: 'a DC motor through gears turns a lead screw that drives an inner tube out of an aluminium outer tube; limit switches cut it at each end',
    spec: (p) => { const v = 9000 / n(p, 'F'); return `about ${v.toFixed(0)} mm/s (typical: force and speed trade through the gearing); about ${((n(p, 'F') * v) / 1000 / 0.25).toFixed(0)} W in (efficiency about a quarter, estimate)`; },
    box: (p) => [40, 60, n(p, 's') + 150], g: (p) => 800 + n(p, 's') * 2.2,
  },
  {
    id: 'vibmotor', name: 'vibration motor, coin', path: 'Electrical/Motors and actuators/Vibration motors', says: 'a flat motor spinning an off-centre weight: the buzz of a phone', std: 'the coin sizes sold (typical)',
    axes: [bare('size', 'diameter × thickness', ['8x2.7', '10x2.7', '10x3.4', '12x3.4'])],
    title: (p) => `coin vibration motor ${String(p.size).replace('x', ' × ')} mm`, of: () => 'magnet-ndfeb winding steel-low tin', make: 'assemble', how: 'a flat coil and an eccentric weight on a tiny rotor in a sealed steel can', spec: () => '3 V, about 60–90 mA, about 12 000 rpm (typical)',
    box: (p) => { const [d, t] = String(p.size).split('x').map(Number) as [number, number]; return [d, d, t]; }, g: (p) => { const [d, t] = String(p.size).split('x').map(Number) as [number, number]; return gOf(cyl(d, t) * 0.6, 7.5); },
  },
  {
    id: 'bearingball', name: 'loose bearing ball', path: 'Mechanical/Bearings/Balls', says: 'a precision ball, for a bearing, a check valve, a detent or a joint', std: 'ISO 3290 sizes (metric and inch), grade G10–G100',
    axes: [ax('d', 'diameter', 'mm', [1, 1.5, 2, 2.381, 2.5, 3, 3.175, 3.5, 3.969, 4, 4.5, 4.763, 5, 5.5, 5.556, 6, 6.35, 7, 7.144, 7.938, 8, 9, 9.525, 10, 11.112, 12, 12.7, 14, 15, 15.875, 16, 19.05, 20, 22.225, 25, 25.4]), bare('matter', 'made of', ['chrome', 'stainless', 'si3n4', 'glass', 'pom'])],
    title: (p) => `${p.d} mm ball, ${madeOf(p)[2]}`, of: (p) => madeOf(p)[0], make: (p) => (p.matter === 'pom' ? 'mould' : p.matter === 'glass' ? 'cast' : 'grind'), how: (p) => (p.matter === 'chrome' || p.matter === 'stainless' ? 'cold-headed from wire, flashed, hardened, ground and lapped round to a micron' : p.matter === 'si3n4' ? 'pressed and sintered silicon nitride, lapped' : 'moulded, then tumbled round'),
    spec: (p) => `${p.d} mm${[2.381, 3.175, 3.969, 4.763, 5.556, 6.35, 7.144, 7.938, 9.525, 11.112, 12.7, 15.875, 19.05, 22.225, 25.4].includes(n(p, 'd')) ? ` (${(n(p, 'd') / 25.4).toFixed(4)} in)` : ''}; ${p.matter === 'chrome' ? 'grade G10, about 60 HRC' : p.matter === 'si3n4' ? 'ceramic: lighter, harder, it will not rust' : ''}`,
    box: (p) => [n(p, 'd'), n(p, 'd'), n(p, 'd')], g: (p) => gOf((Math.PI / 6) * n(p, 'd') ** 3, madeOf(p)[1]),
  },
];
