// Adjustable parts: one entry for every size of a kind of part, not one entry for each size. A family is called with
// its sizes ("screw M4x20", "bearing 6201", "gear m1 z30 b8", "spring d1 D10 L30 n8", "wire 22AWG 2m") and gives an
// item of the inventory made to them: its name, its standard numbers worked out from the standard's tables or its
// law, what it is made of, how it is made, its size and its mass (from its nominal shape and its material's density).
// Tables are the standards' (ISO 261 pitches, ISO 4762 heads, ISO 4032 nuts, ISO 7089 washers, ISO 15 bearing sizes,
// the AWG formula, NEMA ICS 16 faces); laws are the textbooks' (a spring's rate, a gear's pitch circle).

import { BAND, axialBody, axialResistorSolids, bandsOf, ledSolids, solidsMass } from './packages';
import type { Item, Process } from './inventory';
import { METRIC, PAN, SETSCREW_KEY } from './threads';
import { KINDS } from './kinds';
import { CLEAR, NEMA, NEMA_FACE } from './kinds/motion';
export { NEMA, NEMA_FACE };
import { familyOf, partsOf, useFamilies } from './kinds/core';

export { METRIC };

export interface Param { key: string; says: string; unit: string; values?: (string | number)[]; min?: number; max?: number; default: string | number }
export interface Family { id: string; name: string; path: string[]; says: string; params: Param[]; examples: string[]; /** a kind of bought part made from its table (src/nexus/kinds): called only with its sizes */ kind?: true; /** its sizes read from words, or why not */ read(words: string): Record<string, string | number> | string; make(p: Record<string, string | number>): Item }

const RHO = { steel: 7.85, stainless: 8.0, brass: 8.5, aluminium: 2.7, copper: 8.96, pla: 1.24, pom: 1.41 }; // g/cm³
const mm3g = (mm3: number, rho: number) => +((mm3 / 1000) * rho).toFixed(2);
const item = (id: string, name: string, path: string, kind: Item['kind'], make: Process, of: string, says: string, spec: string, size: [number, number, number], g: number, alt?: Process): Item =>
  ({ id, name, path: path.split('/'), kind, make, of: of.split(/\s+/).filter(Boolean).map((x) => { const [c, n] = x.split('*'); return { id: c!, n: Number(n ?? 1) }; }), says, spec, size, g, ...(alt ? { alt } : {}), adjustable: true } as Item);
/** A number from words: "M4", "x20", "20mm", "m1", "z30". */
const num = (s: string | undefined) => (s === undefined ? NaN : Number(s.replace(/,/g, '.')));

// ---- metric threads (ISO 261 coarse pitch; ISO 4762 socket heads; ISO 4032 nuts; ISO 7089 washers) ------------------
const thread = (w: string) => { const m = /\bM(\d+(?:\.\d)?)(?![\d.])/i.exec(w); return m ? `M${m[1]}` : null; };
const screw: Family = {
  id: 'screw', name: 'socket head cap screw', path: ['Hardware', 'Fasteners', 'Screws'], says: 'any metric size and length, with its pitch and head from ISO 261 and ISO 4762',
  params: [{ key: 'thread', says: 'thread size', unit: '', values: Object.keys(METRIC), default: 'M3' }, { key: 'length', says: 'length under the head', unit: 'mm', min: 3, max: 200, default: 10 }, { key: 'class', says: 'strength class', unit: '', values: ['8.8', '10.9', '12.9', 'A2'], default: '12.9' }],
  examples: ['screw M3x10', 'screw M4x20', 'screw M5x16 A2', 'screw M8x40'],
  read(w) { const t = thread(w); if (!t || !METRIC[t]) return `Which thread? ${Object.keys(METRIC).join(', ')}.`; const L = num(/[x×]\s*(\d+(?:\.\d+)?)/i.exec(w)?.[1] ?? /(\d+(?:\.\d+)?)\s*mm/i.exec(w)?.[1]) || 10; const cl = /\b(8\.8|10\.9|12\.9|A2)\b/i.exec(w)?.[1]?.toUpperCase() ?? '12.9'; return { thread: t, length: L, class: cl }; },
  make(p) {
    const t = String(p.thread), L = Number(p.length), d = num(t.slice(1)), T = METRIC[t]!, a2 = p.class === 'A2';
    const v = Math.PI * (d / 2) ** 2 * L * 0.92 + Math.PI * (T.dk / 2) ** 2 * T.k * 0.85;
    return item(`screw-${t.toLowerCase()}x${L}${a2 ? '-a2' : p.class !== '12.9' ? `-${p.class}` : ''}`, `${t} × ${L} socket head cap screw${a2 ? ', stainless' : p.class !== '12.9' ? `, class ${p.class}` : ''}`, 'Hardware/Fasteners/Screws', 'product', 'roll-thread', a2 ? 'stainless-304' : 'steel-alloy', `${a2 ? 'stainless wire' : 'alloy steel wire'} cold-headed to its head and hex socket, its thread rolled${a2 ? '' : ', hardened and tempered, black-oxided'}`, `ISO 4762, class ${p.class}; ${T.p} mm pitch (ISO 261); head ${T.dk} mm across, ${T.k} mm high; a ${t === 'M3' ? '2.5' : t === 'M4' ? '3' : t === 'M5' ? '4' : t === 'M6' ? '5' : t === 'M8' ? '6' : t === 'M2' ? '1.5' : t === 'M2.5' ? '2' : t === 'M10' ? '8' : '10'} mm hex key`, [T.dk, T.dk, L + T.k], mm3g(v, a2 ? RHO.stainless : RHO.steel));
  },
};
const nut: Family = {
  id: 'nut', name: 'hex nut', path: ['Hardware', 'Fasteners', 'Nuts'], says: 'any metric size, its width across flats and height from ISO 4032; nylon lock (ISO 10511) if asked', params: [{ key: 'thread', says: 'thread size', unit: '', values: Object.keys(METRIC), default: 'M3' }, { key: 'lock', says: 'with a nylon ring', unit: '', values: ['no', 'yes'], default: 'no' }],
  examples: ['nut M3', 'nut M5 lock', 'nut M8'],
  read(w) { const t = thread(w); if (!t) return `Which thread? ${Object.keys(METRIC).join(', ')}.`; return { thread: t, lock: /lock|nyloc|nylon/i.test(w) ? 'yes' : 'no' }; },
  make(p) { const t = String(p.thread), T = METRIC[t]!, d = num(t.slice(1)), lock = p.lock === 'yes', v = ((3 * Math.sqrt(3)) / 2) * (T.s / Math.sqrt(3)) ** 2 * T.m - Math.PI * (d / 2) ** 2 * T.m;
    return item(`nut-${t.toLowerCase()}${lock ? '-lock' : ''}`, `${t} hex nut${lock ? ', nylon lock' : ''}`, 'Hardware/Fasteners/Nuts', 'product', 'cold-head', lock ? 'steel-low zinc nylon-insert' : 'steel-low zinc', 'cold-formed from wire, pierced and tapped, zinc-plated', `${lock ? 'ISO 10511' : 'ISO 4032'}; ${T.s} mm across flats, ${T.m} mm high; ${T.p} mm pitch`, [T.s, T.s, T.m], mm3g(v, RHO.steel)); },
};
const washer: Family = {
  id: 'washer', name: 'flat washer', path: ['Hardware', 'Fasteners', 'Washers'], says: 'any metric size from ISO 7089', params: [{ key: 'thread', says: 'for thread', unit: '', values: Object.keys(METRIC), default: 'M3' }], examples: ['washer M3', 'washer M8'],
  read(w) { const t = thread(w); return t ? { thread: t } : `For which thread? ${Object.keys(METRIC).join(', ')}.`; },
  make(p) { const t = String(p.thread), T = METRIC[t]!, v = Math.PI * ((T.d2 / 2) ** 2 - (T.d1 / 2) ** 2) * T.h; return item(`washer-${t.toLowerCase()}`, `${t} washer`, 'Hardware/Fasteners/Washers', 'product', 'stamp', 'steel-low', 'a ring stamped from sheet', `ISO 7089: ${T.d1} × ${T.d2} × ${T.h} mm`, [T.d2, T.d2, T.h], mm3g(v, RHO.steel)); },
};
// ---- deep-groove ball bearings by their number (ISO 15 boundary dimensions) -------------------------------------------
export const BEARINGS: Record<string, [number, number, number]> = {
  '623': [3, 10, 4], '624': [4, 13, 5], '625': [5, 16, 5], '626': [6, 19, 6], '608': [8, 22, 7], '6000': [10, 26, 8], '6001': [12, 28, 8], '6002': [15, 32, 9], '6003': [17, 35, 10], '6004': [20, 42, 12],
  '6200': [10, 30, 9], '6201': [12, 32, 10], '6202': [15, 35, 11], '6203': [17, 40, 12], '6204': [20, 47, 14], '6205': [25, 52, 15],
  '606': [6, 17, 6], '607': [7, 19, 6], '609': [9, 24, 7], '627': [7, 22, 7], '629': [9, 26, 8], '6005': [25, 47, 12], '6006': [30, 55, 13], '6206': [30, 62, 16], '6207': [35, 72, 17],
  '6300': [10, 35, 11], '6301': [12, 37, 12], '6302': [15, 42, 13], '6303': [17, 47, 14], '6304': [20, 52, 15], '6305': [25, 62, 17],
  '6800': [10, 19, 5], '6801': [12, 21, 5], '6802': [15, 24, 5], '6803': [17, 26, 5], '6804': [20, 32, 7], '6805': [25, 37, 7],
  '6900': [10, 22, 6], '6901': [12, 24, 6], '6902': [15, 28, 7], '6903': [17, 30, 7], '6904': [20, 37, 9], '6905': [25, 42, 9],
  // (miniatures, shielded widths: the 684 and 685 a small stepper's bells hold; and the inch R4, 1/4 × 5/8 × 0.196 in,
  // ABMA, for a 1/4 in shaft)
  '684': [4, 9, 4], '685': [5, 11, 5], '686': [6, 13, 5], '687': [7, 14, 5], '688': [8, 16, 5], '689': [9, 17, 5], 'R4': [6.35, 15.875, 4.978],
};
/** A deep-groove bearing's balls: each about 0.3 of its rings' section across (typical), on the pitch circle midway
 *  between its bore and its outside, as many as its rings take when they are pushed eccentric to put them in (the Conrad
 *  assembly: about half the pitch circle full, and one more; typical, within one of makers' counts). */
export const ballsOf = (d: number, D: number): { Db: number; dm: number; z: number } => { const Db = 0.3 * (D - d), dm = (d + D) / 2; return { Db, dm, z: Math.max(6, Math.round((0.5 * Math.PI * dm) / Db + 1)) }; };
/** The bearing a stepper's shaft runs in at each end: of the bearings with the shaft's bore (or the next bore up, the
 *  shaft turned up to it where it sits), the 62 series where its bell's hub round it clears the coils' ends, else a
 *  thinner one; and the tie screws that clamp its bells to its stator: the face's thread where the face is tapped, else M4
 *  (M5 on frames over 70 mm). */
export function stepperBuild(nema: string): { bearing: string; tie: string } {
  const F = NEMA[nema]!, f = NEMA_FACE[nema]!, coils = 0.29 * F + 0.2, hub = Math.max(0.8, 0.04 * F);
  const bores = [...new Set(Object.values(BEARINGS).map(([d]) => d))].sort((a, b) => a - b), bore = bores.find((d) => d >= f.shaft - 1e-6)!;
  const rank = (k: string) => (/^62/.test(k) ? 0 : /^R/.test(k) ? 1 : /^60/.test(k) ? 2 : /^69/.test(k) ? 3 : 4);
  const fits = Object.keys(BEARINGS).filter((k) => BEARINGS[k]![0] === bore).sort((a, b) => rank(a) - rank(b) || BEARINGS[b]![1] - BEARINGS[a]![1]);
  const bearing = fits.find((k) => BEARINGS[k]![1] / 2 + hub + 0.3 < coils) ?? fits[fits.length - 1]!;
  return { bearing, tie: f.through ? (F < 70 ? 'M4' : 'M5') : f.thread };
}
const bearing: Family = {
  id: 'bearing', name: 'deep-groove ball bearing', path: ['Mechanical', 'Bearings', 'Ball bearings'], says: 'any bearing number of the 62x, 60xx, 62xx, 63xx, 68xx and 69xx series and the miniatures, its bore, outside and width from ISO 15 (the inch R4 from ABMA)', params: [{ key: 'number', says: 'bearing number', unit: '', values: Object.keys(BEARINGS), default: '608' }, { key: 'seal', says: 'shields or seals', unit: '', values: ['ZZ', '2RS', 'open'], default: 'ZZ' }],
  examples: ['bearing 608', 'bearing 6201 2RS', 'bearing 625'],
  read(w) { const n = /\b(6\d{2,3}|R\d{1,2})\b/i.exec(w)?.[1]?.toUpperCase(); if (!n || !BEARINGS[n]) return `Which bearing? ${Object.keys(BEARINGS).join(', ')}.`; return { number: n, seal: /2rs/i.test(w) ? '2RS' : /open/i.test(w) ? 'open' : 'ZZ' }; },
  // (about 0.68 of its rings' envelope is steel: SKF's 608-2Z weighs 12 g, its 6204-2Z 110 g)
  make(p) { const n = String(p.number), [d, D, B] = BEARINGS[n]!, v = Math.PI * ((D / 2) ** 2 - (d / 2) ** 2) * B * 0.68; return item(`bearing-${n.toLowerCase()}${p.seal === 'ZZ' ? 'zz' : String(p.seal).toLowerCase()}`, `ball bearing ${n}${p.seal === 'open' ? '' : ` ${p.seal}`} (${d} × ${D} × ${B})`, 'Mechanical/Bearings/Ball bearings', 'product', 'assemble', `bearing-ring*2 bearing-ball*${ballsOf(d, D).z} bearing-cage ${p.seal === 'open' ? '' : p.seal === '2RS' ? 'nbr*2' : 'bearing-shield*2'} grease`, `two rings and a row of balls in a cage${p.seal === 'open' ? '' : p.seal === '2RS' ? ', rubber seals both sides' : ', steel shields both sides'}, greased`, `${d} mm bore, ${D} mm outside, ${B} mm wide (${/^R/.test(n) ? 'ABMA' : 'ISO 15'}); ${ballsOf(d, D).z} balls of about ${ballsOf(d, D).Db.toFixed(1)} mm (typical)`, [D, D, B], mm3g(v, RHO.steel)); },
};
// ---- spur gears by module and teeth -----------------------------------------------------------------------------------
const gear: Family = {
  id: 'gear', name: 'spur gear', path: ['Mechanical', 'Gears and gearboxes', 'Spur gears'], says: 'any module and number of teeth: its pitch circle is module × teeth, its outside module × (teeth + 2)',
  params: [{ key: 'm', says: 'module', unit: 'mm', min: 0.3, max: 5, default: 1 }, { key: 'z', says: 'teeth', unit: '', min: 8, max: 200, default: 20 }, { key: 'b', says: 'face width', unit: 'mm', min: 2, max: 60, default: 8 }, { key: 'matter', says: 'made of', unit: '', values: ['pla', 'pom', 'steel', 'brass', 'aluminium'], default: 'pla' }],
  examples: ['gear m1 z30 b8', 'gear m2 z20 steel', 'gear m0.5 z40 pom'],
  read(w) { const mm = num(/\bm\s*(\d+(?:[.,]\d+)?)/i.exec(w)?.[1]) || 1, z = num(/\bz\s*(\d+)/i.exec(w)?.[1] ?? /(\d+)\s*teeth/i.exec(w)?.[1]) || 20, b = num(/\bb\s*(\d+(?:\.\d+)?)/i.exec(w)?.[1]) || 8, mt = /(pla|pom|acetal|steel|brass|alumin\w*)/i.exec(w)?.[1]?.toLowerCase().replace('acetal', 'pom').replace(/alumin\w*/, 'aluminium') ?? 'pla'; return z < 8 ? 'Under 8 teeth an involute gear undercuts badly: give it 8 or more.' : { m: mm, z, b, matter: mt }; },
  make(p) { const mm = Number(p.m), z = Number(p.z), b = Number(p.b), mt = String(p.matter), d = mm * z, da = mm * (z + 2), rho = (RHO as Record<string, number>)[mt] ?? RHO.pla, v = Math.PI * (d / 2) ** 2 * b * 0.95;
    const how: Process = mt === 'pla' ? 'print' : mt === 'pom' ? 'mould' : mt === 'aluminium' || mt === 'brass' ? 'machine' : 'machine';
    return item(`gear-m${mm}-z${z}-b${b}-${mt}`, `spur gear m${mm}, ${z} teeth, ${b} mm wide, ${mt}`, 'Mechanical/Gears and gearboxes/Spur gears', 'product', how, mt === 'pla' ? 'pla' : mt === 'pom' ? 'pom' : mt === 'steel' ? 'steel-low' : mt === 'brass' ? 'brass' : 'al-6061', 'a gear with involute teeth', `pitch circle ${d} mm, outside ${da} mm, root ${(mm * (z - 2.5)).toFixed(1)} mm; meshes with any m${mm} gear at (z₁ + z₂) × ${mm / 2} mm centres`, [da, da, b], mm3g(v, rho), mt === 'pla' ? undefined : mt === 'brass' || mt === 'aluminium' ? 'cast' : 'print'); },
};
// ---- springs by their wire and coil (k = G d⁴ / 8 D³ n; music wire G ≈ 79 GPa) ----------------------------------------
const spring: Family = {
  id: 'spring', name: 'compression spring', path: ['Mechanical', 'Springs', 'Compression'], says: 'any wire, coil diameter, free length and coils: its rate from G d⁴ / (8 D³ n)',
  params: [{ key: 'd', says: 'wire diameter', unit: 'mm', min: 0.2, max: 6, default: 1 }, { key: 'D', says: 'mean coil diameter', unit: 'mm', min: 2, max: 80, default: 10 }, { key: 'L', says: 'free length', unit: 'mm', min: 3, max: 300, default: 30 }, { key: 'n', says: 'active coils', unit: '', min: 2, max: 60, default: 8 }],
  examples: ['spring d1 D10 L30 n8', 'spring d0.5 D5 L15 n10', 'spring d2 D20 L60 n6'],
  read(w) { const g = (k: string, dflt: number) => num(new RegExp(`\\b${k}\\s*(\\d+(?:[.,]\\d+)?)`).exec(w)?.[1]) || dflt; return { d: g('d', 1), D: g('D', 10), L: g('L', 30), n: g('n', 8) }; },
  make(p) { const d = Number(p.d), D = Number(p.D), L = Number(p.L), n = Number(p.n), G = 79_000, k = (G * d ** 4) / (8 * D ** 3 * n), solid = d * (n + 2), wire = Math.PI * D * (n + 2), v = Math.PI * (d / 2) ** 2 * wire;
    return item(`spring-d${d}-D${D}-L${L}-n${n}`, `compression spring ${d} × ${D} × ${L} mm, ${n} coils`, 'Mechanical/Springs/Compression', 'product', 'coil', 'steel-spring', 'music wire coiled on a mandrel, its ends closed and ground, stress-relieved', `rate ${k.toFixed(2)} N/mm (G = 79 GPa); solid at about ${solid.toFixed(1)} mm; spring index D/d = ${(D / d).toFixed(1)}${D / d < 4 ? ' (too tight to coil well)' : D / d > 12 ? ' (loose: it may buckle or tangle)' : ''}`, [D + d, D + d, L], mm3g(v, RHO.steel)); },
};
// ---- wire by gauge (AWG: d = 0.127 × 92^((36 − n)/39) mm) ---------------------------------------------------------------
const wire: Family = {
  id: 'wire', name: 'hook-up wire', path: ['Electrical', 'Wiring and connectors', 'Wire'], says: 'any AWG gauge and length: its diameter from the AWG formula and its resistance from copper\'s', params: [{ key: 'awg', says: 'gauge', unit: 'AWG', min: 10, max: 32, default: 22 }, { key: 'length', says: 'length', unit: 'm', min: 0.05, max: 100, default: 1 }],
  examples: ['wire 22AWG 2m', 'wire 18AWG 0.5m', 'wire 28AWG 1m'],
  read(w) { const g = num(/(\d+)\s*awg/i.exec(w)?.[1]) || 22, L = num(/(\d+(?:\.\d+)?)\s*m\b/i.exec(w)?.[1]) || 1; return { awg: g, length: L }; },
  make(p) { const n = Number(p.awg), L = Number(p.length), d = 0.127 * 92 ** ((36 - n) / 39), A = Math.PI * (d / 2) ** 2, R = (1.72e-8 * L) / (A * 1e-6);
    return item(`wire-${n}awg-${L}m`, `${n} AWG hook-up wire, ${L} m`, 'Electrical/Wiring and connectors/Wire', 'product', 'extrude', 'conductor-strand wire-insulation', 'copper strands in PVC insulation', `${d.toFixed(3)} mm copper (${A.toFixed(3)} mm²); ${(R * 1000).toFixed(1)} mΩ over ${L} m at 20 °C (ρ 1.72 × 10⁻⁸ Ω·m)`, [d + 1.2, d + 1.2, L * 1000], mm3g(A * L * 1000, RHO.copper) + mm3g(Math.PI * (((d + 1.2) / 2) ** 2 - (d / 2) ** 2) * L * 1000, 1.4)); },
};
// ---- aluminium extrusions by series and length ---------------------------------------------------------------------------
const EXTRUSIONS: Record<string, { w: number; h: number; kgm: number }> = { '2020': { w: 20, h: 20, kgm: 0.5 }, '2040': { w: 20, h: 40, kgm: 0.8 }, '3030': { w: 30, h: 30, kgm: 0.9 }, '4040': { w: 40, h: 40, kgm: 1.5 } };
const extrusion: Family = {
  id: 'extrusion', name: 'T-slot aluminium extrusion', path: ['Hardware', 'Structural', 'Extrusions'], says: 'any series and length', params: [{ key: 'series', says: 'profile', unit: '', values: Object.keys(EXTRUSIONS), default: '2020' }, { key: 'length', says: 'length', unit: 'mm', min: 10, max: 6000, default: 500 }],
  examples: ['extrusion 2020 500', 'extrusion 2040 1000', 'extrusion 4040 300'],
  read(w) { const s = /\b(2020|2040|3030|4040)\b/.exec(w)?.[1] ?? '2020', L = num(/\b(\d{2,4})\s*(?:mm)?\s*$/.exec(w.replace(/\b(2020|2040|3030|4040)\b/, ''))?.[1]) || 500; return { series: s, length: L }; },
  make(p) { const s = String(p.series), L = Number(p.length), E = EXTRUSIONS[s]!; return item(`extrusion-${s}-${L}`, `${s} extrusion, ${L} mm`, 'Hardware/Structural/Extrusions', 'product', 'extrude', 'al-6063', 'a T-slot profile extruded from 6063 and aged, cut to length', `${E.w} × ${E.h} mm; about ${E.kgm} kg a metre (typical)`, [E.w, E.h, L], +(E.kgm * L).toFixed(0)); },
};
// ---- resistors by value and power (E-series values) -------------------------------------------------------------------
const resistor: Family = {
  id: 'resistor', name: 'metal-film resistor', path: ['Electrical', 'Passive components', 'Resistors'], says: 'any value and power: "4.7k", "220R", "1M"', params: [{ key: 'ohms', says: 'resistance', unit: 'Ω', min: 1, max: 1e7, default: 1000 }, { key: 'watts', says: 'power', unit: 'W', values: [0.125, 0.25, 0.5, 1, 2], default: 0.25 }],
  examples: ['resistor 220R', 'resistor 4.7k 0.5W', 'resistor 1M'],
  read(w) { const m = /(\d+(?:[.,]\d+)?)\s*([rkm])?(\d*)\b/i.exec(w.replace(/resistor/i, '')); if (!m) return 'What value? e.g. 220R, 4.7k, 1M.'; const mul = { r: 1, k: 1e3, m: 1e6 }[(m[2] ?? 'r').toLowerCase() as 'r' | 'k' | 'm']; const v = num(`${m[1]}${m[3] ? `.${m[3]}` : ''}`) * mul; const W = num(/(\d+(?:\.\d+)?)\s*w\b/i.exec(w)?.[1]) || 0.25; return { ohms: v, watts: W }; },
  make(p) { const R = Number(p.ohms), W = Number(p.watts), say = R >= 1e6 ? `${R / 1e6} MΩ` : R >= 1e3 ? `${R / 1e3} kΩ` : `${R} Ω`, [L, D, ld] = axialBody(W);
    return item(`resistor-${R}-${W}w`, `${say} resistor, ${W} W`, 'Electrical/Passive components/Resistors', 'product', 'assemble', 'alumina nichrome lead-wire*2 epoxy', 'a metal film on a ceramic rod, a spiral cut to set its value, end caps, leads, a lacquer coat', `${say} ±1 %; carries up to ${Math.sqrt(W / R).toFixed(4)} A at ${W} W (I = √(P/R)); ${L} × ${D} mm body (typical); its bands ${bandsOf(R).map((b) => BAND[b]![0]).join(', ')} (IEC 60062)`, [D, D, L], +solidsMass(axialResistorSolids(L, D, R, ld)).toFixed(4)); },
};
const PI = Math.PI, polarXZ = (r: number, a: number): [number, number] => [r * Math.cos(a), r * Math.sin(a)];
const insideOct = (x: number, z: number, F: number, c: number) => Math.min(F / 2 - Math.abs(x), F / 2 - Math.abs(z), (F - c - Math.abs(x) - Math.abs(z)) / Math.SQRT2);
/** A stepper's build, mm, from its frame and length: its magnetic parts, bells and stack, bearing and tie screws (the
 *  component library draws it, src/nexus/components.ts; its family lists what is in it by these) */
export function stepperDims(p: Record<string, string | number>) {
  const n = String(p.nema), F = NEMA[n]!, f = NEMA_FACE[n]!, L = Number(p.length), { bearing, tie } = stepperBuild(n), [db, D, Bb] = BEARINGS[bearing]!, { dm } = ballsOf(db, D);
  const through = !!f.through, T = METRIC[tie]!, dt = Number(tie.slice(1)), c = 0.1 * F;
  // (its magnetic parts, by the frame: rotor, air gap, teeth, pole shoes and bodies, back iron, coils; typical)
  const Dr = 0.52 * F, Rs = Dr / 2 + 0.05, td = 0.0106 * F, hs = 0.03 * F, wp = 0.105 * F, Rb = 0.43 * F, g = 0.15, r1 = Rs + hs + g;
  const tc = (r1 * Math.sin(PI / 8) - 0.25) / Math.cos(PI / 8) - wp / 2 - g, w = wp / 2 + g + tc;
  // (through-hole frames: the body behind the flange cut back at its corners, room for the mounting bolts' nuts; their
  // tie screws in the back iron between the poles; tapped frames' tie screws through the corners, into the face's holes)
  const nutR = (METRIC[f.thread]!.s / Math.cos(PI / 6)) / 2, rh = (f.holes / 2) * Math.SQRT2, cb = through ? Math.max(c, F - Math.SQRT2 * (rh - nutR - 0.5)) : c;
  const ties: [number, number][] = through ? [0, 1, 2, 3].map((k) => polarXZ(Rb + 0.8 + (CLEAR[tie] ?? dt * 1.1) / 2, PI / 8 + (k * PI) / 2)) : ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as [number, number][]).map(([x, z]) => [(x * f.holes) / 2, (z * f.holes) / 2] as [number, number]);
  const r2 = Math.min(Math.sqrt((Rb - 0.2) ** 2 - w * w), Rb);
  // (the face: tapped holes 4.5 mm deep, then the tie screws' ends, one and a half diameters in; a through frame's flange)
  const tf0 = through ? 0.085 * F : Math.max(1.5, 0.07 * F);
  let fb = through ? Math.max(Bb + tf0, tf0 + 1.5 * dt + 1) : Math.max(Bb + tf0, 4.5 + 0.5 + 1.5 * dt);
  // (the rear plate: deep enough to sink the screws' heads where their counterbores fit inside its outline, else thin with
  // the heads proud)
  const cbR = (T.dk + 0.6) / 2, sinks = ties.every(([x, z]) => insideOct(x, z, F, cb) >= cbR + 0.3);
  let P1 = sinks ? T.k : Math.max(1.5, 0.06 * F), sunk = sinks;
  // (a short body: its heads proud, then its front bell thinner, so its stack is at least 0.3 of it)
  if (L - fb - (Bb + P1) < 0.3 * L && sunk) { P1 = Math.max(1.5, 0.06 * F); sunk = false; }
  if (L - fb - (Bb + P1) < 0.3 * L) fb = Math.max(Bb + 1.5, L - 0.3 * L - (Bb + P1));
  // (and deep enough for its leads, laid on its floor, to pass under the coils' ends; its front bell for the coils' ends)
  const rb = Math.max(Bb + P1, P1 + 1.42 + g + tc + 0.2); fb = Math.max(fb, Math.min(tf0, fb - Bb) + g + tc + 0.4);
  const Ls = L - fb - rb, tf = Math.min(tf0, fb - Bb);
  // (the bells' cavities 0.4 mm clear of the coils' ends)
  const tieL = Math.round((through ? -tf - 1 : -5) - (-L + (sunk ? P1 : 0)));
  return { tieL, Rcav: Rb + 0.4, n, F, f, L, bearing, tie, T, dt, db, D, Bb, dm, through, c, cb, Dr, Rs, td, hs, wp, Rb, g, r1, r2, tc, w, ties, fb, tf, P1, rb, Ls, sunk, hw: Math.max(0.8, 0.04 * F) };
}
// ---- stepper motors by NEMA frame (face sizes, NEMA ICS 16) -------------------------------------------------------------
// (NEMA frames and faces: src/nexus/kinds/motion.ts, where the motor plate's kind reads them too)

const stepper: Family = {
  id: 'stepper', name: 'stepper motor', path: ['Electrical', 'Motors and actuators', 'Stepper motors'], says: 'any NEMA frame and body length, 1.8° a step', params: [{ key: 'nema', says: 'frame', unit: 'NEMA', values: Object.keys(NEMA), default: '17' }, { key: 'length', says: 'body length', unit: 'mm', min: 20, max: 120, default: 40 }],
  examples: ['stepper nema17 40', 'stepper nema23 56', 'stepper nema14 34'],
  read(w) { const n = /nema\s*(\d+)/i.exec(w)?.[1] ?? '17'; if (!NEMA[n]) return `Which frame? NEMA ${Object.keys(NEMA).join(', ')}.`; const L = num(/\b(\d{2,3})\s*(?:mm)?\s*$/.exec(w.replace(/nema\s*\d+/i, ''))?.[1]) || 40; return { nema: n, length: L }; },
  // (its mass rises with its stack, its bells light: steel 0.62 of its square face over its length less 4.8 mm, fitted to
  // STEPPERONLINE's NEMA 17 sheets: 17HS08-1004S 20 mm 0.14 kg, 17HS4401 40 mm 280 g, 17HS19-2004S1 48 mm 0.40 kg; other
  // frames scaled by their face, typical)
  make(p) { const n = String(p.nema), F = NEMA[n]!, L = Number(p.length), g = mm3g(F * F * Math.max(0.3 * L, L - 4.8) * 0.62, RHO.steel), b = stepperBuild(n);
    const { of, inner } = partsOf(`stator-stepper rotor-stepper end-bell*2 {bearing ${b.bearing}}*2 {screw ${b.tie}x${stepperDims(p).tieL}}*4 wire-hookup*4 jst-xh`);
    return { ...item(`stepper-nema${n}-${L}`, `NEMA ${n} stepper, ${L} mm`, 'Electrical/Motors and actuators/Stepper motors', 'product', 'assemble', '', 'two phases of coils on a toothed stator, a toothed magnet rotor, end bells, a bearing in each, four tie screws, four leads to a plug', `${F} mm face (NEMA ICS 16); 1.8° a step (200 a turn); holding torque grows with body length; mass from its shape: about ${g} g`, [F, F, L], g), of, inner }; },
};
// ---- cells by their size code --------------------------------------------------------------------------------------------
const CELLS: Record<string, [number, number, number]> = { '18650': [18, 65, 47], '21700': [21, 70, 68], '14500': [14, 50, 20], '26650': [26, 65, 90] };
const cell: Family = {
  id: 'cell', name: 'cylindrical lithium-ion cell', path: ['Electrical', 'Power', 'Cells'], says: 'any size code: the first two digits its diameter, the next its length (mm)', params: [{ key: 'size', says: 'size code', unit: '', values: Object.keys(CELLS), default: '18650' }],
  examples: ['cell 18650', 'cell 21700'],
  read(w) { const s = /\b(18650|21700|14500|26650)\b/.exec(w)?.[1]; return s ? { size: s } : `Which size? ${Object.keys(CELLS).join(', ')}.`; },
  make(p) { const s = String(p.size), [d, L, g] = CELLS[s]!; return item(`cell-${s}`, `lithium-ion cell ${s}`, 'Electrical/Power/Cells', 'product', 'assemble', 'jelly-roll electrolyte-li cell-can cell-cap', 'a wound roll of cathode, separator and anode in a steel can, sealed under a vented cap', `${d} mm × ${L} mm; 3.6 V nominal; about ${g} g (typical)`, [d, d, L], g); },
};
// ---- GT2 pulleys and belts ---------------------------------------------------------------------------------------------
/** A GT2 pulley as drawn, mm: its pitch diameter its teeth × 2 / π and its outside 0.508 mm under that, one set screw to
 *  16 teeth and two at 90° above (PowerDrive's GT2 catalogue); its flanges 1 mm, 2 mm proud of its teeth, its face 7 mm
 *  for a 6 mm belt and its hub 7 mm long, a little over its teeth across (at most 18 mm), set screws M3 to an 8 mm bore and
 *  M4 above, as long as its hub's wall allows (typical of printer pulleys: a 20 tooth, 5 mm bore is 16 mm long, its hub
 *  13 mm across). */
export function gt2Dims(p: Record<string, string | number>) {
  const teeth = Number(p.teeth), bore = Number(p.bore), rb = bore / 2, PD = (2 * teeth) / Math.PI, Ro = (PD - 0.508) / 2, Rf = Ro + 2, fl = 1, face = 7, hubL = 7;
  const ss = bore <= 8 ? 3 : 4, Rh = Math.max(rb + ss + 0.5, Math.min(Ro + 0.4, 9)), sL = [2, 2.5, 3, 4, 5, 6, 8, 10].filter((x) => x <= Rh - rb).pop() ?? 2;
  const angles = teeth <= 16 ? [0] : [0, Math.PI / 2], groove = 0.6 * 1.15 * 0.75;
  const vol = Math.PI * (Rh ** 2 - rb ** 2) * hubL + 2 * Math.PI * (Rf ** 2 - rb ** 2) * fl + (Math.PI * (Ro ** 2 - rb ** 2) - teeth * groove) * face;
  return { teeth, bore, PD, Ro, Rf, fl, face, hubL, ss, Rh, sL, angles, vol, L: hubL + 2 * fl + face };
}
const pulley: Family = {
  id: 'pulley', name: 'GT2 pulley', path: ['Mechanical', 'Linear motion', 'Belts and pulleys'], says: 'any number of teeth: 2 mm of belt a tooth; pitch diameter teeth × 2 / π', params: [{ key: 'teeth', says: 'teeth', unit: '', min: 12, max: 80, default: 20 }, { key: 'bore', says: 'bore', unit: 'mm', min: 3, max: 12, default: 5 }],
  examples: ['pulley 20t 5mm', 'pulley 16t 5mm', 'pulley 60t 8mm'],
  read(w) { const t = num(/(\d+)\s*t\b/i.exec(w)?.[1] ?? /(\d+)\s*teeth/i.exec(w)?.[1]) || 20, b = num(/(\d+)\s*mm/i.exec(w)?.[1]) || 5; return { teeth: t, bore: b }; },
  make(p) {
    const d = gt2Dims(p), t = d.teeth, b = d.bore, n = d.angles.length, { of: screws, inner } = partsOf(`{setscrew M${d.ss}x${d.sL}}*${n}`), sg = inner[0]?.g ?? 0;
    return { ...item(`pulley-gt2-${t}t-${b}`, `GT2 pulley, ${t} teeth, ${b} mm bore`, 'Mechanical/Linear motion/Belts and pulleys', 'product', 'machine', 'al-6061', `an aluminium pulley for a 2 mm pitch belt, held on its shaft by ${n === 1 ? 'a set screw' : 'two set screws at 90°'}`, `pitch diameter ${d.PD.toFixed(2)} mm, outside ${(2 * d.Ro).toFixed(2)} mm (PowerDrive); ${2 * t} mm of belt a turn; ${d.L} mm long, flanges ${(2 * d.Rf).toFixed(1)} mm (typical)`, [2 * d.Rf, 2 * d.Rf, d.L], +(mm3g(d.vol, RHO.aluminium) + n * sg).toFixed(2), 'print'), of: [{ id: 'al-6061', n: 1 }, ...screws], inner };
  },
};
const leadscrew: Family = {
  id: 'leadscrew', name: 'lead screw', path: ['Mechanical', 'Linear motion', 'Screws'], says: 'any diameter, pitch, starts and length: its lead is pitch × starts', params: [{ key: 'd', says: 'diameter', unit: 'mm', values: [5, 6, 8, 10, 12], default: 8 }, { key: 'pitch', says: 'pitch', unit: 'mm', min: 1, max: 5, default: 2 }, { key: 'starts', says: 'starts', unit: '', min: 1, max: 4, default: 4 }, { key: 'length', says: 'length', unit: 'mm', min: 50, max: 1500, default: 300 }],
  examples: ['leadscrew T8 p2 s4 300', 'leadscrew T8 p2 s1 400', 'leadscrew T12 p3 s1 500'],
  read(w) { const d = num(/T\s*(\d+)/i.exec(w)?.[1]) || 8, p = num(/\bp\s*(\d+(?:\.\d+)?)/i.exec(w)?.[1]) || 2, s = num(/\bs\s*(\d)/i.exec(w)?.[1]) || 4, L = num(/\b(\d{2,4})\s*(?:mm)?\s*$/.exec(w)?.[1]) || 300; return { d, pitch: p, starts: s, length: L }; },
  make(p) { const d = Number(p.d), pi = Number(p.pitch), s = Number(p.starts), L = Number(p.length), lead = pi * s; return item(`leadscrew-t${d}-p${pi}-s${s}-${L}`, `T${d} lead screw, lead ${lead} mm, ${L} mm`, 'Mechanical/Linear motion/Screws', 'product', 'roll-thread', 'lead-screw lead-nut', 'a rolled-thread stainless screw with its brass nut', `lead ${lead} mm a turn (pitch ${pi} × ${s} start${s > 1 ? 's' : ''}); on a 1.8° stepper ${(lead / 200).toFixed(3)} mm a full step; ${s === 1 ? 'self-locking: it does not back-drive' : 'fast, and it can back-drive'}`, [d, d, L], mm3g(Math.PI * (d / 2) ** 2 * L * 0.8, RHO.stainless)); },
};
const led: Family = {
  id: 'led', name: 'LED', path: ['Electrical', 'Semiconductors', 'LEDs'], says: 'any colour and size; its forward voltage typical of its die', params: [{ key: 'colour', says: 'colour', unit: '', values: ['red', 'yellow', 'green', 'blue', 'white'], default: 'red' }, { key: 'size', says: 'size', unit: 'mm', values: [3, 5, 10], default: 5 }],
  examples: ['led red 5mm', 'led white 3mm', 'led blue 10mm'],
  read(w) { const c = /(red|yellow|green|blue|white)/i.exec(w)?.[1]?.toLowerCase() ?? 'red', s = num(/(\d+)\s*mm/i.exec(w)?.[1]) || 5; return { colour: c, size: s }; },
  make(p) { const c = String(p.colour), s = Number(p.size), vf = c === 'red' || c === 'yellow' ? 2 : 3.1, die = c === 'red' || c === 'yellow' ? 'led-die-algainp' : 'led-die-ingan'; return item(`led-${c}-${s}mm`, `${c} LED, ${s} mm`, 'Electrical/Semiconductors/LEDs', 'product', 'assemble', `${die} lead-frame bond-wire epoxy`, `a ${c === 'red' || c === 'yellow' ? 'AlGaInP' : 'InGaN'} die in a reflector cup, a bond wire to the other lead, cast in an epoxy lens`, `about ${vf} V forward at 20 mA (typical); a series resistor of (V − ${vf}) / 0.02 Ω`, [s, s, s * 1.7], +solidsMass(ledSolids(s, c === 'red' || c === 'yellow' ? 'algainp' : 'gan')).toFixed(4)); },
};

// ---- O-rings by inside diameter and cross-section ---------------------------------------------------------------------
const oring: Family = {
  id: 'oring', name: 'O-ring', path: ['Mechanical', 'Seals', 'O-rings'], says: 'any inside diameter and cross-section, in nitrile, silicone or FKM', params: [{ key: 'id', says: 'inside diameter', unit: 'mm', min: 1, max: 500, default: 10 }, { key: 'cs', says: 'cross-section', unit: 'mm', min: 0.5, max: 12, default: 2 }, { key: 'matter', says: 'rubber', unit: '', values: ['nbr', 'silicone', 'fkm'], default: 'nbr' }],
  examples: ['oring 10x2', 'oring 25x3 silicone', 'oring 6x1.5'],
  read(w) { const m = /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/.exec(w); if (!m) return 'Give it as inside × section, e.g. 10x2.'; return { id: num(m[1]), cs: num(m[2]), matter: /silicone/i.test(w) ? 'silicone' : /fkm|viton/i.test(w) ? 'fkm' : 'nbr' }; },
  make(p) { const d1 = Number(p.id), d2 = Number(p.cs), D = d1 + d2, v = (Math.PI ** 2 * D * d2 ** 2) / 4; return item(`oring-${d1}x${d2}-${p.matter}`, `O-ring ${d1} × ${d2} mm, ${p.matter}`, 'Mechanical/Seals/O-rings', 'product', 'mould', p.matter === 'silicone' ? 'silicone' : 'nbr', 'a ring of rubber squeezed in a groove to seal', `${d1} mm inside, ${d2} mm section; groove depth about 0.75–0.8 × section for a static seal (typical)`, [D + d2, D + d2, d2], mm3g(v, 1.25)); },
};
// ---- brushed DC motors by can size ---------------------------------------------------------------------------------------
const DCM: Record<string, [number, number, number]> = { '130': [20, 25, 18], '180': [20, 32, 25], '280': [24, 30, 35], '370': [24, 30, 40], '385': [28, 38, 60], '540': [36, 50, 160], '550': [36, 57, 190], '775': [42, 66, 330] };
const dcmotor: Family = {
  id: 'dcmotor', name: 'brushed DC motor', path: ['Electrical', 'Motors and actuators', 'DC motors'], says: 'any can size code (130, 280, 370, 540, 775, …) and voltage', params: [{ key: 'size', says: 'can size', unit: '', values: Object.keys(DCM), default: '130' }, { key: 'volts', says: 'voltage', unit: 'V', min: 1.5, max: 48, default: 6 }],
  examples: ['dcmotor 130 6V', 'dcmotor 540 12V', 'dcmotor 775 24V'],
  read(w) { const sz = /\b(130|180|280|370|385|540|550|775)\b/.exec(w)?.[1]; if (!sz) return `Which size? ${Object.keys(DCM).join(', ')}.`; return { size: sz, volts: num(/(\d+(?:\.\d+)?)\s*v\b/i.exec(w)?.[1]) || 6 }; },
  make(p) { const sz = String(p.size), [d, L, g] = DCM[sz]!; return item(`dcmotor-${sz}-${p.volts}v`, `brushed DC motor ${sz}, ${p.volts} V`, 'Electrical/Motors and actuators/DC motors', 'product', 'assemble', 'motor-can magnet-ferrite-arc*2 armature end-cap-motor carbon-brush*2 brush-spring*2 sleeve-bearing*2', 'a wound rotor in the field of ferrite magnets, its current switched by brushes on a commutator', `can about ${d} mm across, ${L} mm long, about ${g} g (typical of the ${sz} size); speed rises with volts, torque with current`, [d, d, L], g); },
};
// ---- hobby servos by size ---------------------------------------------------------------------------------------------
const SERVOS: Record<string, { box: [number, number, number]; g: number; torque: string; gears: string }> = { micro: { box: [23, 12.2, 29], g: 9, torque: '1.8 kg·cm at 4.8 V (SG90)', gears: 'gear-plastic*4' }, standard: { box: [40.7, 19.7, 42.9], g: 55, torque: '9.4 kg·cm at 4.8 V (MG996R)', gears: 'gear-small*4' } };
const servo: Family = {
  id: 'servo', name: 'hobby servo', path: ['Electrical', 'Motors and actuators', 'Servos'], says: 'micro (SG90 size) or standard (MG996R size)', params: [{ key: 'size', says: 'size', unit: '', values: Object.keys(SERVOS), default: 'micro' }],
  examples: ['servo micro', 'servo standard'],
  read(w) { return { size: /standard|mg996|large/i.test(w) ? 'standard' : 'micro' }; },
  make(p) { const k = String(p.size), S = SERVOS[k]!; return item(`servo-${k}`, `${k} servo`, 'Electrical/Motors and actuators/Servos', 'product', 'assemble', `servo-case motor-130 ${S.gears} potentiometer servo-board wire-hookup*3`, 'a DC motor through a gear train to an output shaft, a potentiometer on it for feedback, a control board, in a case', `${S.box.join(' × ')} mm, ${S.g} g; stall ${S.torque}`, S.box, S.g); },
};
// ---- axial fans by frame and voltage --------------------------------------------------------------------------------------
const fan: Family = {
  id: 'fan', name: 'axial fan', path: ['Electrical', 'Motors and actuators', 'Fans'], says: 'any square frame (40–120 mm), thickness and voltage', params: [{ key: 'size', says: 'frame', unit: 'mm', values: [25, 30, 40, 50, 60, 80, 92, 120], default: 40 }, { key: 'thick', says: 'thickness', unit: 'mm', values: [10, 15, 20, 25], default: 10 }, { key: 'volts', says: 'voltage', unit: 'V', values: [5, 12, 24], default: 12 }],
  examples: ['fan 40x10 12V', 'fan 120x25 12V', 'fan 30x10 5V'],
  read(w) { const m = /(\d{2,3})\s*[x×]\s*(\d{2})/.exec(w); return { size: num(m?.[1]) || 40, thick: num(m?.[2]) || 10, volts: num(/(\d+)\s*v\b/i.exec(w)?.[1]) || 12 }; },
  make(p) { const s2 = Number(p.size), t = Number(p.thick); return item(`fan-${s2}x${t}-${p.volts}v`, `${s2} × ${t} mm fan, ${p.volts} V`, 'Electrical/Motors and actuators/Fans', 'product', 'assemble', 'fan-frame fan-impeller winding*4 magnet-ferrite-arc ic-package sleeve-bearing wire-hookup*2', 'a small brushless motor (a wound stator and a magnet ring in the hub) turning moulded blades in a square frame, switched by a driver chip', `${s2} mm square, ${t} mm thick, holes ${s2 === 40 ? 32 : s2 === 120 ? 105 : s2 === 80 ? 71.5 : s2 === 60 ? 50 : s2 === 92 ? 82.5 : s2 === 50 ? 40 : s2 === 30 ? 24 : 20} mm apart (typical)`, [s2, s2, t], +(s2 * s2 * t * 0.00035).toFixed(0)); },
};
// ---- linear rails by size and length ------------------------------------------------------------------------------------
/** HIWIN MGN miniature guideways (HIWIN MG series catalogue, 2-6-12; mm, kg): the assembly H high over the rail's foot,
 *  the block's skirt H1 above it, the block W wide with its tapped holes (M, Ml deep) B across by C along, the rail WR by
 *  HR, its holes counterbored D for h over d through, P apart and E from its end, the bolt it takes, its mass a metre; each
 *  block short (C) or long (H): its holes C apart, its steel L1 long and L over its end seals, its ratings and its mass
 *  (end caps, seals and balls in it). Its balls: MGN9's 1/16 in and MGN12's 3/32 in (rebuilders' counts, not HIWIN's);
 *  MGN7's and MGN15's scaled from those by the rail's width (estimate). Rail, block, balls and retainers are of one
 *  hardenable stainless (HIWIN: "a special grade of stainless steel"), drawn as 440C. */
export const MGN: Record<number, { H: number; H1: number; N: number; W: number; B: number; M: string; Ml: number; WR: number; HR: number; D: number; h: number; d: number; P: number; E: number; bolt: string; kgm: number; ball: number; blocks: Record<'C' | 'H', { C: number; L1: number; L: number; Cd: number; C0: number; kg: number }> }> = {
  7: { H: 8, H1: 1.5, N: 5, W: 17, B: 12, M: 'M2', Ml: 2.5, WR: 7, HR: 4.8, D: 4.2, h: 2.3, d: 2.4, P: 15, E: 5, bolt: 'M2x6', kgm: 0.22, ball: 1.31, blocks: { C: { C: 8, L1: 13.5, L: 22.5, Cd: 0.98, C0: 1.24, kg: 0.01 }, H: { C: 13, L1: 21.8, L: 30.8, Cd: 1.37, C0: 1.96, kg: 0.015 } } },
  9: { H: 10, H1: 2, N: 5.5, W: 20, B: 15, M: 'M3', Ml: 3, WR: 9, HR: 6.5, D: 6, h: 3.5, d: 3.5, P: 20, E: 7.5, bolt: 'M3x8', kgm: 0.38, ball: 1.5875, blocks: { C: { C: 10, L1: 18.9, L: 28.9, Cd: 1.86, C0: 2.55, kg: 0.016 }, H: { C: 16, L1: 29.9, L: 39.9, Cd: 2.55, C0: 4.02, kg: 0.026 } } },
  12: { H: 13, H1: 3, N: 7.5, W: 27, B: 20, M: 'M3', Ml: 3.5, WR: 12, HR: 8, D: 6, h: 4.5, d: 3.5, P: 25, E: 10, bolt: 'M3x8', kgm: 0.65, ball: 2.381, blocks: { C: { C: 15, L1: 21.7, L: 34.7, Cd: 2.84, C0: 3.92, kg: 0.034 }, H: { C: 20, L1: 32.4, L: 45.4, Cd: 3.72, C0: 5.88, kg: 0.054 } } },
  15: { H: 16, H1: 4, N: 8.5, W: 32, B: 25, M: 'M3', Ml: 4, WR: 15, HR: 10, D: 6, h: 4.5, d: 3.5, P: 40, E: 15, bolt: 'M3x10', kgm: 1.06, ball: 2.81, blocks: { C: { C: 20, L1: 26.7, L: 42.1, Cd: 4.61, C0: 5.59, kg: 0.059 }, H: { C: 25, L1: 43.4, L: 58.8, Cd: 6.37, C0: 9.11, kg: 0.092 } } },
};
/** An MGN rail and its carriage as drawn, mm: the rail along z, its foot at y = 0, the block at the middle of its travel.
 *  Typical where HIWIN does not say (estimates, each named): the block's slot 0.3 of a ball wider than the rail each side
 *  and 0.2 above it; the grooves 0.52 of a ball across (a typical conformity) with 5 µm of running clearance; the ball rows
 *  0.4 mm of wall above the block's skirt from their return holes; each circuit a load row and a return row 1.3 balls apart,
 *  running half a ball into the end caps, turned round on 0.65 of a ball; the end caps 0.7 of what is beyond the steel and
 *  the seals 0.3; two screws a seal (the iFixit MGN guide), M1.6 on MGN7 and 9 and M2 on MGN12 and 15 (estimate), long
 *  enough to take 1.5 d of thread in the block, above the return rows and their heads 0.6 mm clear of the rail; a retaining wire under each load row 0.24 of a ball across. */
export function mgnDims(p: Record<string, string | number>) {
  const sz = Number(p.size), t = (String(p.block ?? 'H').toUpperCase() === 'C' ? 'C' : 'H') as 'C' | 'H', R = MGN[sz]!, blk = R.blocks[t], L = Number(p.length);
  const Db = R.ball, gs = 0.3 * Db, cl = 0.005, rg = 0.52 * Db, gt = 0.2, Ht = R.H - R.Ml, rh = Db / 2 + 0.03;
  const yb = R.H1 + rh + 0.4, xb = R.WR / 2 + gs / 2, xw = R.WR / 2 + gs, rt = 0.65 * Db, xr = xb + 2 * rt, e0 = Db / 2;
  const e = (blk.L - blk.L1) / 2, ls = 0.3 * e, lc = e - ls;
  const run = 2 * (blk.L1 + 2 * e0) + 2 * Math.PI * rt, n = Math.floor(run / (Db + 0.005));
  const sd = sz <= 9 ? 'M1.6' : 'M2', sdd = Number(sd.slice(1)), SL = [4, 5, 6, 8, 10, 12, 16].find((x) => x >= ls + lc + 1.5 * sdd)!, te = SL - ls - lc;
  const ys = yb + rh + 0.3 + sdd / 2, xs = Math.max(xr, R.WR / 2 + PAN[sd]!.dk / 2 + 0.6), rw = 0.12 * Db, yw = yb - Db / 2 - rw - 0.02;
  const nh = Math.max(1, Math.floor((L - 2 * R.E) / R.P) + 1), E1 = (L - (nh - 1) * R.P) / 2, a = (R.D / 2 + (xb - Db / 2 - cl)) / 2;
  return { ...R, size: sz, t, blk, L, Db, gs, cl, rg, gt, Ht, rh, yb, xb, xw, rt, xr, e0, e, ls, lc, run, n, sd, sdd, SL, te, ys, xs, rw, yw, nh, E1, a, travel: L - blk.L };
}
const rail: Family = {
  id: 'rail', name: 'miniature linear rail', path: ['Mechanical', 'Linear motion', 'Rails'], says: 'MGN7, 9, 12 or 15 (HIWIN), any length, with its short (C) or long (H) carriage', params: [{ key: 'size', says: 'rail width', unit: 'mm', values: [7, 9, 12, 15], default: 12 }, { key: 'block', says: 'carriage', unit: '', values: ['C', 'H'], default: 'H' }, { key: 'length', says: 'length', unit: 'mm', min: 50, max: 2000, default: 400 }],
  examples: ['rail MGN12H 400', 'rail MGN9H 300', 'rail MGN15C 1000'],
  read(w) {
    const m = /mgn\s*(\d+)\s*([ch])?\b/i.exec(w), sz = num(m?.[1]) || 12, b = (m?.[2] ?? 'H').toUpperCase(), L = num(/\b(\d{2,4})\s*(?:mm)?\s*$/.exec(w.replace(/mgn\s*\d+\s*[ch]?/i, ''))?.[1]) || 400;
    if (!MGN[sz]) return 'Which size? MGN7, 9, 12, 15.';
    // (a rail shorter than its carriage carries it on nothing: its balls would run off its end)
    const bl = MGN[sz]!.blocks[b as 'C' | 'H'].L; if (L < bl + 5) return `An MGN${sz}${b} carriage is ${bl} mm long: its rail must be longer than that, ${Math.ceil(bl + 5)} mm or more.`;
    return { size: sz, block: b, length: L };
  },
  make(p) {
    const d = mgnDims(p), { size: sz, t, blk, L } = d, ss = 'stainless-440c', rho = 7.8, nm = `MGN${sz}${t}`, id = `rail-mgn${sz}${t.toLowerCase()}-${L}`;
    const ballG = +((Math.PI / 6) * d.Db ** 3 * rho / 1000).toFixed(4), U = d.W * (d.H - d.H1) - (d.WR + 2 * d.gs) * (d.HR + d.gt - d.H1);
    const capG = +(U * d.lc * 1.41 / 1000).toFixed(3), sealG = +(U * d.ls * (0.65 * 1.0 + 0.35 * 7.9) / 1000).toFixed(3), wireG = +(Math.PI * d.rw ** 2 * (blk.L1 + 2 * d.lc) * 7.9 / 1000).toFixed(4);
    const { of: screws, inner: si } = partsOf(`{panhead ${d.sd}x${d.SL} PH A2}*4`), screwG = si[0]?.g ?? 0;
    const nip = sz === 15 ? [item('grease-nipple-m3', 'grease nipple, M3', 'Mechanical/Linear motion/Rail parts', 'part', 'machine', 'brass nickel', 'a ball-headed nipple a grease gun clips onto, screwed into an end cap (MGN15\'s, HIWIN)', 'M3; 4.5 mm proud (HIWIN\'s G); hex 4 mm (estimate)', [4, 4, 7.5], 0.4)] : [];
    const parts = [
      item(`mgn${sz}-rail-${L}`, `MGN${sz} rail, ${L} mm`, 'Mechanical/Linear motion/Rail parts', 'part', 'grind', ss, `the ground rail: a groove down each side for the balls, ${d.nh} holes counterbored for ${d.bolt} cap screws`, `${d.WR} × ${d.HR} mm; holes ${d.d} mm through, ${d.D} counterbored ${d.h} deep, every ${d.P} mm, ${d.E1.toFixed(1)} from its ends; ${d.kgm} kg/m (HIWIN)`, [d.WR, d.HR, L], +(d.kgm * L).toFixed(1)),
      item(`mgn${sz}${t.toLowerCase()}-block`, `${nm} block`, 'Mechanical/Linear motion/Rail parts', 'part', 'grind', ss, 'the carriage\'s ground steel: its two grooves facing the rail\'s, a return hole beside each, four tapped holes on top', `${d.W} × ${blk.L1} mm, ${d.H - d.H1} high; ${d.M} × ${d.Ml} holes ${d.B} by ${blk.C} apart (HIWIN)`, [d.W, d.H - d.H1, blk.L1], +(blk.kg * 1000 - 2 * capG - 2 * sealG - 2 * d.n * ballG - 2 * wireG - 4 * screwG - nip.reduce((a, x) => a + x.g!, 0)).toFixed(2)),
      item(`mgn${sz}-end-cap`, `MGN${sz} end cap`, 'Mechanical/Linear motion/Rail parts', 'part', 'mould', 'pom', 'the moulded cap at each end of the block whose channels turn the balls round from their load rows to their returns', `${d.lc.toFixed(1)} mm thick (estimate)`, [d.W, d.H - d.H1, d.lc], capG),
      item(`mgn${sz}-end-seal`, `MGN${sz} end seal`, 'Mechanical/Linear motion/Rail parts', 'part', 'mould', 'nbr steel-low', 'a rubber wiper bonded to a steel plate at each end, its lip on the rail', `${d.ls.toFixed(1)} mm thick (estimate)`, [d.W, d.H - d.H1, d.ls], sealG),
      item(`mgn${sz}-retainer`, `MGN${sz} retaining wire`, 'Mechanical/Linear motion/Rail parts', 'part', 'draw', 'stainless-304', 'a wire under each row of balls that holds them in the block when it is off its rail', `${(2 * d.rw).toFixed(2)} mm (estimate)`, [2 * d.rw, 2 * d.rw, blk.L1 + 2 * d.lc], wireG),
      item(`steel-ball-${d.Db}`, `${d.Db} mm steel ball`, 'Mechanical/Bearings/Bearing parts', 'part', 'grind', ss, 'a ball ground and lapped round', `${d.Db} mm`, [d.Db, d.Db, d.Db], ballG),
    ];
    const of = [{ id: parts[0]!.id, n: 1 }, { id: parts[1]!.id, n: 1 }, { id: parts[2]!.id, n: 2 }, { id: parts[3]!.id, n: 2 }, { id: parts[4]!.id, n: 2 }, { id: parts[5]!.id, n: 2 * d.n }, ...screws, ...nip.map((x) => ({ id: x.id, n: 1 }))];
    return { ...item(id, `${nm} rail, ${L} mm, with its carriage`, 'Mechanical/Linear motion/Rails', 'product', 'assemble', '', 'a ground stainless rail and a carriage whose balls roll in two circuits along its grooves and back round through its end caps, wiped by a seal at each end', `${d.WR} mm rail; ${blk.L} mm carriage, ${d.W} wide, ${d.H} high over the rail's foot; C ${blk.Cd} kN, C0 ${blk.C0} kN (HIWIN); ${2 * d.n} balls; travel ${d.travel.toFixed(0)} mm`, [d.W, d.H, L], +(d.kgm * L + blk.kg * 1000).toFixed(1)), of, inner: [...parts, ...si, ...nip] };
  },
};
// ---- round stock: shafts, rods, tubes, threaded rod -----------------------------------------------------------------
const MAT: Record<string, [string, number, string]> = { steel: ['steel-low', RHO.steel, 'steel'], stainless: ['stainless-304', RHO.stainless, 'stainless'], aluminium: ['al-6061', RHO.aluminium, 'aluminium'], brass: ['brass', RHO.brass, 'brass'], copper: ['copper', RHO.copper, 'copper'] };
// "304" as a word (the grade), not inside a number: a 1304 mm length is not stainless
const matOf = (w: string) => /stainless|(?<![\d.])304(?![\d.x×])/i.test(w) ? 'stainless' : /alumin/i.test(w) ? 'aluminium' : /brass/i.test(w) ? 'brass' : /copper/i.test(w) ? 'copper' : 'steel';
const rod: Family = {
  id: 'rod', name: 'round rod or shaft', path: ['Hardware', 'Structural', 'Rod'], says: 'any diameter, length and metal', params: [{ key: 'd', says: 'diameter', unit: 'mm', min: 1, max: 100, default: 8 }, { key: 'length', says: 'length', unit: 'mm', min: 5, max: 3000, default: 300 }, { key: 'matter', says: 'metal', unit: '', values: Object.keys(MAT), default: 'steel' }],
  examples: ['rod 8mm 300 steel', 'rod 5mm 100 stainless', 'rod 20mm 500 aluminium'],
  read(w) { const d = num(/(\d+(?:\.\d+)?)\s*mm/i.exec(w)?.[1] ?? /\bd\s*(\d+(?:\.\d+)?)/i.exec(w)?.[1]) || 8, L = num(/\b(\d{2,4})\b(?!\s*mm)/.exec(w.replace(/(\d+(?:\.\d+)?)\s*mm/i, ''))?.[1]) || 300; return { d, length: L, matter: matOf(w) }; },
  make(p) { const d = Number(p.d), L = Number(p.length), [mid, rho, word] = MAT[String(p.matter)]!; return item(`rod-${d}-${L}-${p.matter}`, `${word} rod Ø${d} × ${L} mm`, 'Hardware/Structural/Rod', 'product', 'draw', mid, `round ${word} bar, drawn or turned to size, cut to length`, `Ø${d} mm × ${L} mm; ${mm3g(Math.PI * (d / 2) ** 2 * 1000, rho)} g a metre`, [d, d, L], mm3g(Math.PI * (d / 2) ** 2 * L, rho)); },
};
const tube: Family = {
  id: 'tube', name: 'tube', path: ['Hardware', 'Structural', 'Tube'], says: 'round or square, any outside, wall, length and metal', params: [{ key: 'shape', says: 'shape', unit: '', values: ['round', 'square'], default: 'round' }, { key: 'od', says: 'outside', unit: 'mm', min: 3, max: 300, default: 20 }, { key: 'wall', says: 'wall', unit: 'mm', min: 0.3, max: 20, default: 1.5 }, { key: 'length', says: 'length', unit: 'mm', min: 10, max: 6000, default: 500 }, { key: 'matter', says: 'metal', unit: '', values: Object.keys(MAT), default: 'aluminium' }],
  examples: ['tube round 20x1.5 500 aluminium', 'tube square 25x2 1000 steel', 'tube round 8x1 200 brass'],
  read(w) { const m = /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/.exec(w); if (!m) return 'Give it as outside × wall, then length: tube round 20x1.5 500.'; const L = num(/[x×]\s*\d+(?:\.\d+)?\s+(\d+)/.exec(w)?.[1]) || 500; return { shape: /square|box/i.test(w) ? 'square' : 'round', od: num(m[1]), wall: num(m[2]), length: L, matter: matOf(w) === 'steel' && !/steel/i.test(w) ? 'aluminium' : matOf(w) }; },
  make(p) { const od = Number(p.od), t = Number(p.wall), L = Number(p.length), sq = p.shape === 'square', [mid, rho, word] = MAT[String(p.matter)]!, A = sq ? od * od - (od - 2 * t) ** 2 : Math.PI * ((od / 2) ** 2 - (od / 2 - t) ** 2);
    const I = sq ? (od ** 4 - (od - 2 * t) ** 4) / 12 : (Math.PI * (od ** 4 - (od - 2 * t) ** 4)) / 64;
    return item(`tube-${p.shape}-${od}x${t}-${L}-${p.matter}`, `${word} ${p.shape} tube ${od} × ${t} × ${L} mm`, 'Hardware/Structural/Tube', 'product', p.matter === 'steel' ? 'weld' : 'extrude', mid, sq ? 'strip rolled to a square and seam-welded, or extruded' : 'drawn or extruded tube', `area ${A.toFixed(1)} mm², second moment ${I.toFixed(0)} mm⁴ (for bending: stress = M × (od/2) / I)`, [od, od, L], mm3g(A * L, rho)); },
};
const threadedrod: Family = {
  id: 'threadedrod', name: 'threaded rod', path: ['Hardware', 'Fasteners', 'Threaded rod'], says: 'any metric thread and length', params: [{ key: 'thread', says: 'thread', unit: '', values: Object.keys(METRIC), default: 'M8' }, { key: 'length', says: 'length', unit: 'mm', min: 10, max: 3000, default: 1000 }],
  examples: ['threadedrod M8 1000', 'threadedrod M5 300'],
  read(w) { const t = thread(w); return t ? { thread: t, length: num(/\b(\d{2,4})\s*(?:mm)?\s*$/.exec(w.replace(/M\d+(\.\d)?/i, ''))?.[1]) || 1000 } : `Which thread? ${Object.keys(METRIC).join(', ')}.`; },
  make(p) { const t = String(p.thread), d = num(t.slice(1)), L = Number(p.length); return item(`threadedrod-${t.toLowerCase()}-${L}`, `${t} threaded rod, ${L} mm`, 'Hardware/Fasteners/Threaded rod', 'product', 'roll-thread', 'steel-low zinc', 'steel rod threaded its whole length by rolling, zinc-plated', `${METRIC[t]!.p} mm pitch (ISO 261)`, [d, d, L], mm3g(Math.PI * (d / 2) ** 2 * L * 0.85, RHO.steel)); },
};
// ---- sheet by metal and thickness ------------------------------------------------------------------------------------
const sheet: Family = {
  id: 'sheet', name: 'sheet', path: ['Hardware', 'Structural', 'Sheet'], says: 'any metal or plastic, thickness and size', params: [{ key: 'matter', says: 'matter', unit: '', values: [...Object.keys(MAT), 'acrylic', 'plywood', 'fr4'], default: 'aluminium' }, { key: 't', says: 'thickness', unit: 'mm', min: 0.1, max: 50, default: 2 }, { key: 'w', says: 'width', unit: 'mm', min: 10, max: 3000, default: 300 }, { key: 'h', says: 'length', unit: 'mm', min: 10, max: 3000, default: 300 }],
  examples: ['sheet aluminium 2mm 300x300', 'sheet acrylic 3mm 200x150', 'sheet steel 1.5mm 500x500'],
  read(w) { const t = num(/(\d+(?:\.\d+)?)\s*mm/i.exec(w)?.[1]) || 2, m = /(\d+)\s*[x×]\s*(\d+)/.exec(w); const mt = /acrylic|pmma/i.test(w) ? 'acrylic' : /plywood|ply/i.test(w) ? 'plywood' : /fr-?4/i.test(w) ? 'fr4' : matOf(w) === 'steel' && !/steel/i.test(w) ? 'aluminium' : matOf(w); return { matter: mt, t, w: num(m?.[1]) || 300, h: num(m?.[2]) || 300 }; },
  make(p) { const mt = String(p.matter), t = Number(p.t), w = Number(p.w), h = Number(p.h), metal = MAT[mt], rho = metal ? metal[1] : mt === 'acrylic' ? 1.18 : mt === 'plywood' ? 0.68 : 1.85, mid = metal ? metal[0] : mt === 'acrylic' ? 'pmma' : mt === 'plywood' ? 'wood-veneer' : 'fr4';
    return item(`sheet-${mt}-${t}-${w}x${h}`, `${mt} sheet ${t} mm, ${w} × ${h}`, 'Hardware/Structural/Sheet', 'product', metal ? 'extrude' : mt === 'plywood' ? 'laminate' : 'chemistry', mid, metal ? 'rolled to thickness and sheared to size' : mt === 'plywood' ? 'veneers glued crosswise' : 'cast or laminated sheet', `${t} mm thick, ${w} × ${h} mm`, [w, h, t], mm3g(w * h * t, rho)); },
};
// ---- battery packs by cells in series and parallel ----------------------------------------------------------------------
const pack: Family = {
  id: 'pack', name: 'lithium-ion battery pack', path: ['Electrical', 'Power', 'Battery packs'], says: 'any number of 18650 cells in series (S) and parallel (P), with a protection board', params: [{ key: 's', says: 'in series', unit: 'S', min: 1, max: 14, default: 3 }, { key: 'p', says: 'in parallel', unit: 'P', min: 1, max: 10, default: 1 }],
  examples: ['pack 3S1P', 'pack 4S2P', 'pack 1S3P'],
  read(w) { const m = /(\d+)\s*s\s*(\d+)?\s*p?/i.exec(w); return { s: num(m?.[1]) || 3, p: num(m?.[2]) || 1 }; },
  make(p) { const S = Number(p.s), P = Number(p.p), n = S * P; return item(`pack-${S}s${P}p`, `battery pack ${S}S${P}P`, 'Electrical/Power/Battery packs', 'product', 'assemble', `cell-18650*${n} bms-board nickel*${n} pack-holder jst-xh`, `${n} cells, ${S} in series${P > 1 ? `, ${P} strings side by side` : ''}, joined by nickel strip, behind a protection board`, `${(3.6 * S).toFixed(1)} V nominal (${(4.2 * S).toFixed(1)} V full); about ${(3.6 * S * 3 * P).toFixed(0)} Wh with 3 Ah cells (typical)`, [18 * Math.min(S, 4) + 4, 18 * P * Math.ceil(S / 4) + 4, 70], 47 * n + 20); },
};
// ---- capacitors by value and voltage ------------------------------------------------------------------------------------
const capacitor: Family = {
  id: 'capacitor', name: 'capacitor', path: ['Electrical', 'Passive components', 'Capacitors'], says: 'any value and voltage: electrolytic from 1 µF, ceramic below', params: [{ key: 'farads', says: 'capacitance', unit: 'F', min: 1e-12, max: 1, default: 1e-4 }, { key: 'volts', says: 'voltage', unit: 'V', min: 4, max: 450, default: 25 }],
  examples: ['capacitor 100uF 25V', 'capacitor 100nF 50V', 'capacitor 1000uF 16V'],
  read(w) { const m = /(\d+(?:\.\d+)?)\s*([pnuµm])f/i.exec(w); if (!m) return 'What value? e.g. 100nF, 10uF, 1000uF.'; const mul = { p: 1e-12, n: 1e-9, u: 1e-6, µ: 1e-6, m: 1e-3 }[m[2]!.toLowerCase() as 'p']; return { farads: num(m[1]) * mul, volts: num(/(\d+)\s*v\b/i.exec(w)?.[1]) || 25 }; },
  make(p) { const F = Number(p.farads), V = Number(p.volts), el = F >= 1e-6, say = F >= 1e-6 ? `${+(F * 1e6).toPrecision(3)} µF` : F >= 1e-9 ? `${+(F * 1e9).toPrecision(3)} nF` : `${+(F * 1e12).toPrecision(3)} pF`, E = 0.5 * F * V * V;
    return item(`capacitor-${say.replace('µ', 'u').replace('.', '_').replace(/[^\w]/g, '').toLowerCase()}-${V}v`, `${say} capacitor, ${V} V`, 'Electrical/Passive components/Capacitors', 'product', el ? 'assemble' : 'sinter', el ? 'al-foil*2 paper electrolyte-al lead-wire*2 rubber al-6061' : 'batio3 nickel tin', el ? 'aluminium foils and paper soaked in electrolyte, wound and sealed in a can' : 'ceramic layers and nickel electrodes fired together', `${say}, rated ${V} V; holds ${E < 1e-3 ? `${(E * 1e6).toFixed(1)} µJ` : `${E.toFixed(3)} J`} at that (½ C V²)${el ? '; polarised: mind its stripe' : ''}`, el ? [Math.max(5, Math.cbrt(F * 1e6 * V) * 2.2), Math.max(5, Math.cbrt(F * 1e6 * V) * 2.2), Math.max(7, Math.cbrt(F * 1e6 * V) * 3.5)] : [3.2, 1.6, 1.2], el ? +(Math.cbrt(F * 1e6 * V) * 0.6).toFixed(1) : 0.01); },
};
// ---- standoffs and heat-set inserts ---------------------------------------------------------------------------------------
const standoff: Family = {
  id: 'standoff', name: 'standoff', path: ['Hardware', 'Fasteners', 'Spacers'], says: 'any thread and length, brass or nylon', params: [{ key: 'thread', says: 'thread', unit: '', values: ['M2', 'M2.5', 'M3', 'M4'], default: 'M3' }, { key: 'length', says: 'length', unit: 'mm', min: 3, max: 60, default: 10 }, { key: 'matter', says: 'made of', unit: '', values: ['brass', 'nylon'], default: 'brass' }],
  examples: ['standoff M3 10', 'standoff M2.5 6 nylon'],
  read(w) { const t = thread(w) ?? 'M3'; return { thread: t, length: num(/\b(\d+(?:\.\d+)?)\s*(?:mm)?\b(?!.*\d)/.exec(w.replace(/M\d+(\.\d)?/i, ''))?.[1]) || 10, matter: /nylon/i.test(w) ? 'nylon' : 'brass' }; },
  make(p) { const t = String(p.thread), L = Number(p.length), s2 = METRIC[t]?.s ?? 5, br = p.matter === 'brass'; return item(`standoff-${t.toLowerCase()}-${L}-${p.matter}`, `${t} × ${L} mm standoff, ${p.matter}`, 'Hardware/Fasteners/Spacers', 'product', br ? 'machine' : 'mould', br ? 'brass' : 'nylon', 'a hex spacer, threaded inside at both ends (or male at one)', `${s2} mm across flats, ${L} mm`, [s2, s2, L], mm3g(((3 * Math.sqrt(3)) / 2) * (s2 / Math.sqrt(3)) ** 2 * L * 0.7, br ? RHO.brass : 1.14), br ? 'cast' : 'print'); },
};
const insert: Family = {
  id: 'insert', name: 'heat-set insert', path: ['Hardware', 'Fasteners', 'Inserts'], says: 'any thread M2–M5 and length, brass, to melt into printed parts', params: [{ key: 'thread', says: 'thread', unit: '', values: ['M2', 'M2.5', 'M3', 'M4', 'M5'], default: 'M3' }, { key: 'length', says: 'length', unit: 'mm', min: 2, max: 12, default: 4 }],
  examples: ['insert M3 4', 'insert M4 6'],
  read(w) { return { thread: thread(w) ?? 'M3', length: num(/\b(\d+(?:\.\d+)?)\s*(?:mm)?\s*$/.exec(w.replace(/M\d+(\.\d)?/i, ''))?.[1]) || 4 }; },
  make(p) { const t = String(p.thread), d = num(t.slice(1)), L = Number(p.length), od = d * 1.6; return item(`insert-${t.toLowerCase()}-${L}`, `${t} × ${L} mm heat-set insert`, 'Hardware/Fasteners/Inserts', 'product', 'machine', 'brass', 'a knurled brass insert pressed hot into a printed hole so the part has a metal thread', `${od.toFixed(1)} mm outside; the hole printed about ${(od - 0.3).toFixed(1)} mm (typical)`, [od, od, L], mm3g(Math.PI * ((od / 2) ** 2 - (d / 2) ** 2) * L, RHO.brass), 'cast'); },
};
// ---- closed timing belts and circuit boards ---------------------------------------------------------------------------
const belt: Family = {
  id: 'belt', name: 'GT2 timing belt', path: ['Mechanical', 'Linear motion', 'Belts and pulleys'], says: 'open by the metre, or closed loops of any length, 6 or 10 mm wide', params: [{ key: 'length', says: 'length', unit: 'mm', min: 50, max: 10000, default: 1000 }, { key: 'width', says: 'width', unit: 'mm', values: [6, 9, 10, 15], default: 6 }, { key: 'loop', says: 'closed loop', unit: '', values: ['no', 'yes'], default: 'no' }],
  examples: ['belt GT2 1000 6mm', 'belt GT2 loop 200 6mm', 'belt GT2 2000 10mm'],
  read(w) { const L = num(/\b(\d{2,5})\b(?!\s*mm)/.exec(w.replace(/gt2/i, '').replace(/\d+\s*mm/i, ''))?.[1]) || 1000, W = num(/(\d+)\s*mm/i.exec(w)?.[1]) || 6; return { length: L, width: W, loop: /loop|closed/i.test(w) ? 'yes' : 'no' }; },
  make(p) { const L = Number(p.length), W = Number(p.width), loop = p.loop === 'yes'; return item(`belt-gt2-${L}-${W}${loop ? '-loop' : ''}`, `GT2 belt ${W} mm, ${L} mm${loop ? ' loop' : ''}`, 'Mechanical/Linear motion/Belts and pulleys', 'product', 'mould', 'timing-belt-body tension-cord-glass', 'a toothed belt of neoprene round glass-fibre cords', `2 mm pitch${loop ? `, ${L / 2} teeth round` : ''}; ${W} mm wide`, [W, 1.4, L], mm3g(W * 1.4 * L, 1.3)); },
};
const pcb: Family = {
  id: 'pcb', name: 'circuit board', path: ['Electrical', 'Boards and controllers', 'Circuit boards'], says: 'any size, layer count and thickness', params: [{ key: 'w', says: 'width', unit: 'mm', min: 5, max: 500, default: 50 }, { key: 'h', says: 'height', unit: 'mm', min: 5, max: 500, default: 50 }, { key: 'layers', says: 'copper layers', unit: '', values: [1, 2, 4, 6, 8], default: 2 }, { key: 't', says: 'thickness', unit: 'mm', values: [0.8, 1.0, 1.2, 1.6, 2.0], default: 1.6 }],
  examples: ['pcb 50x50 2 layers', 'pcb 100x80 4 layers 1.6mm'],
  read(w) { const m = /(\d+)\s*[x×]\s*(\d+)/.exec(w); return { w: num(m?.[1]) || 50, h: num(m?.[2]) || 50, layers: num(/(\d)\s*layers?/i.exec(w)?.[1]) || 2, t: num(/(\d(?:\.\d)?)\s*mm/i.exec(w)?.[1]) || 1.6 }; },
  make(p) { const w = Number(p.w), h = Number(p.h), L = Number(p.layers), t = Number(p.t); return item(`pcb-${w}x${h}-${L}l-${t}`, `circuit board ${w} × ${h} mm, ${L} layers`, 'Electrical/Boards and controllers/Circuit boards', 'part', 'etch', `fr4 copper-foil*${L} solder-mask tin`, `FR-4 with ${L} layers of copper etched to traces, plated holes joining them, solder mask and tinned pads`, `${w} × ${h} × ${t} mm; 35 µm copper a layer (1 oz) typical`, [w, h, t], mm3g(w * h * t, 1.85)); },
};


// ==== more families: hex bolts, set screws, dowels, circlips, keys, roller chain and its sprockets, linear bearings,
// magnets, pipe, I-beams, connectors, cartridge heaters, thermistors, shaft couplings ===================================
/** ISO 4017 hex head heights, mm. */
export const HEX_K: Record<string, number> = { 'M1.6': 1.1, M2: 1.4, 'M2.5': 1.7, M3: 2, M4: 2.8, M5: 3.5, M6: 4, M8: 5.3, M10: 6.4, M12: 7.5, M14: 8.8, M16: 10, M20: 12.5, M24: 15 };
export const CLASSES = ['4.6', '4.8', '5.6', '5.8', '6.8', '8.8', '10.9', '12.9', 'A2', 'A4'];
const lengthIn = (w: string, d: number) => num(/[x×]\s*(\d+(?:\.\d+)?)/i.exec(w)?.[1] ?? /(\d+(?:\.\d+)?)\s*mm\b/i.exec(w)?.[1]) || d;
const classIn = (w: string, d: string) => /(?:^|\s)(4\.6|4\.8|5\.6|5\.8|6\.8|8\.8|10\.9|12\.9|A2|A4)(?=\s|$)/i.exec(w)?.[1]?.toUpperCase() ?? d;
const metres = (w: string, d: number) => num(/(\d+(?:\.\d+)?)\s*m\b/i.exec(w)?.[1]) || d;
const threadAsk = `Which thread? ${Object.keys(METRIC).join(', ')}.`;
const bolt: Family = {
  id: 'bolt', name: 'hex head bolt', path: ['Hardware', 'Fasteners', 'Bolts'], says: 'any metric size and length, its head from ISO 4017 and its pitch from ISO 261',
  params: [{ key: 'thread', says: 'thread size', unit: '', values: Object.keys(METRIC), default: 'M8' }, { key: 'length', says: 'length under the head', unit: 'mm', min: 4, max: 300, default: 30 }, { key: 'class', says: 'strength class', unit: '', values: CLASSES, default: '8.8' }],
  examples: ['bolt M8x30', 'bolt M10x50 10.9', 'bolt M6x20 A2', 'bolt M20x80'],
  read(w) { const t = thread(w); if (!t || !METRIC[t]) return threadAsk; return { thread: t, length: lengthIn(w, 30), class: classIn(w, '8.8') }; },
  make(p) {
    const t = String(p.thread), L = Number(p.length), d = num(t.slice(1)), T = METRIC[t]!, k = HEX_K[t] ?? 0.7 * d, cl = String(p.class), st = /^A/.test(cl);
    const v = Math.PI * (d / 2) ** 2 * L * 0.92 + ((3 * Math.sqrt(3)) / 2) * (T.s / Math.sqrt(3)) ** 2 * k;
    return item(`bolt-${t.toLowerCase()}x${L}${cl === '8.8' ? '' : `-${cl.toLowerCase()}`}`, `${t} × ${L} hex bolt, class ${cl}`, 'Hardware/Fasteners/Bolts', 'product', 'roll-thread', st ? 'stainless-304' : 'steel-alloy', `cold-headed from ${st ? 'stainless' : 'alloy steel'} wire, its thread rolled${st ? '' : ', hardened and zinc-plated'}`, `${T.p} mm pitch, ${T.s} mm across flats, head ${k} mm high (ISO 4017); class ${cl}`, [T.s, T.s, L + k], mm3g(v, st ? RHO.stainless : RHO.steel));
  },
};
const setscrew: Family = {
  id: 'setscrew', name: 'set screw, cup point', path: ['Hardware', 'Fasteners', 'Set screws'], says: 'a headless screw with a hex socket and a cup point (ISO 4029), any metric size',
  params: [{ key: 'thread', says: 'thread size', unit: '', values: Object.keys(METRIC), default: 'M4' }, { key: 'length', says: 'length', unit: 'mm', min: 2, max: 60, default: 6 }],
  examples: ['setscrew M3x4', 'setscrew M4x6', 'setscrew M8x10'],
  read(w) { const t = thread(w); if (!t || !METRIC[t]) return threadAsk; return { thread: t, length: lengthIn(w, 6) }; },
  make(p) { const t = String(p.thread), L = Number(p.length), d = num(t.slice(1)), T = METRIC[t]!; return item(`setscrew-${t.toLowerCase()}x${L}`, `${t} × ${L} set screw, cup point`, 'Hardware/Fasteners/Set screws', 'product', 'roll-thread', 'steel-alloy', 'cold-formed with its socket, thread-rolled and hardened to class 45H', `${T.p} mm pitch; cup point (ISO 4029); hardness class 45H; a ${SETSCREW_KEY[t] ?? 0.5 * d} mm key`, [d, d, L], mm3g((Math.PI / 4) * (d - 0.6495 * T.p) ** 2 * L - (Math.sqrt(3) / 2) * (SETSCREW_KEY[t] ?? 0.5 * d) ** 2 * Math.min(0.45 * d, 0.6 * L) - (Math.PI / 4) * (0.5 * d) ** 2 * 0.15 * d, RHO.steel)); },
};
const dowel: Family = {
  id: 'dowel', name: 'dowel pin', path: ['Hardware', 'Fasteners', 'Pins'], says: 'a hardened, ground dowel pin of any diameter and length (ISO 8734), to locate one part on another',
  params: [{ key: 'd', says: 'diameter', unit: 'mm', min: 1, max: 20, default: 4 }, { key: 'length', says: 'length', unit: 'mm', min: 3, max: 120, default: 20 }],
  examples: ['dowel 4x20', 'dowel 3x10', 'dowel 8x40'],
  read(w) { const m = /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/.exec(w); return m ? { d: num(m[1]), length: num(m[2]) } : 'A dowel as diameter × length: "dowel 4x20".'; },
  make(p) { const d = Number(p.d), L = Number(p.length); return item(`dowel-${d}x${L}`, `dowel pin ${d} × ${L}`, 'Hardware/Fasteners/Pins', 'product', 'grind', 'steel-chrome', 'cut from bar, through-hardened and ground to an m6 fit', `${d} mm m6 × ${L} mm, hardened (ISO 8734)`, [d, d, L], mm3g(Math.PI * (d / 2) ** 2 * L, RHO.steel)); },
};
/** DIN 471 external retaining rings, by shaft diameter: thickness and groove diameter, mm. */
export const CIRCLIPS: Record<number, [number, number]> = { 4: [0.4, 3.8], 5: [0.6, 4.8], 6: [0.7, 5.7], 8: [0.8, 7.6], 10: [1, 9.6], 12: [1, 11.5], 15: [1, 14.3], 17: [1, 16.2], 20: [1.2, 19], 25: [1.2, 23.9], 30: [1.5, 28.6] };
const circlip: Family = {
  id: 'circlip', name: 'retaining ring (circlip), external', path: ['Hardware', 'Fasteners', 'Retaining rings'], says: 'a spring-steel ring that snaps into a groove on a shaft (DIN 471), by the shaft it fits',
  params: [{ key: 'd', says: 'shaft diameter', unit: 'mm', values: Object.keys(CIRCLIPS).map(Number), default: 8 }],
  examples: ['circlip 8', 'circlip 12mm', 'circlip 20'],
  read(w) { const d = num(/(\d+)/.exec(w)?.[1]); return CIRCLIPS[d] ? { d } : `For which shaft? ${Object.keys(CIRCLIPS).join(', ')} mm.`; },
  make(p) { const d = Number(p.d), [t, g] = CIRCLIPS[d]!, b = 0.1 * d + 1; return item(`circlip-${d}`, `circlip for ${/^(8|11|18)$/.test(String(d)) ? 'an' : 'a'} ${d} mm shaft`, 'Hardware/Fasteners/Retaining rings', 'product', 'stamp', 'steel-spring', 'stamped from spring steel, hardened, with two lug holes for the pliers', `${t} mm thick, into a ${g} mm groove (DIN 471)`, [d + 2 * b, d + 2 * b, t], mm3g(Math.PI * ((g / 2 + b) ** 2 - (g / 2) ** 2) * t * 0.85, RHO.steel)); },
};
/** DIN 6885 A parallel keys: the shafts each width is for (over, up to), and its width and height, mm. */
export const KEYS: [number, number, number, number][] = [[6, 8, 2, 2], [8, 10, 3, 3], [10, 12, 4, 4], [12, 17, 5, 5], [17, 22, 6, 6], [22, 30, 8, 7], [30, 38, 10, 8], [38, 44, 12, 8]];
const key: Family = {
  id: 'key', name: 'parallel key', path: ['Mechanical', 'Shafts and hubs', 'Keys'], says: 'a parallel key for a shaft (DIN 6885 A): give the shaft, or width × height × length',
  params: [{ key: 'b', says: 'width', unit: 'mm', min: 2, max: 12, default: 5 }, { key: 'h', says: 'height', unit: 'mm', min: 2, max: 8, default: 5 }, { key: 'length', says: 'length', unit: 'mm', min: 6, max: 100, default: 20 }],
  examples: ['key 5x5x20', 'key shaft 20 L30', 'key 8x7x40'],
  read(w) {
    const m = /(\d+)\s*[x×]\s*(\d+)\s*[x×]\s*(\d+)/.exec(w); if (m) return { b: num(m[1]), h: num(m[2]), length: num(m[3]) };
    const d = num(/(?:shaft|for)\s*(\d+(?:\.\d+)?)/i.exec(w)?.[1] ?? /(\d+(?:\.\d+)?)\s*mm\s*shaft/i.exec(w)?.[1]), row = KEYS.find(([lo, hi]) => d > lo && d <= hi);
    if (!row) return 'A key for which shaft (6–44 mm), or as width × height × length: "key 5x5x20".';
    return { b: row[2], h: row[3], length: num(/\bL\s*(\d+)/i.exec(w)?.[1]) || Math.round(1.5 * d) };
  },
  make(p) { const b = Number(p.b), h = Number(p.h), L = Number(p.length); return item(`key-${b}x${h}x${L}`, `parallel key ${b} × ${h} × ${L}`, 'Mechanical/Shafts and hubs/Keys', 'product', 'machine', 'steel-alloy', 'cut from bright key steel (C45) and its ends rounded', `${b} × ${h} mm, ${L} mm long, form A (DIN 6885)`, [b, L, h], mm3g(b * h * L * 0.95, RHO.steel)); },
};
/** Roller chain (ISO 606 B series; ANSI 25, 35, 40): pitch, roller diameter, inner width (mm), and about how heavy (kg/m, makers' catalogues). */
export const CHAINS: Record<string, { p: number; roller: number; width: number; kgm: number }> = {
  '25': { p: 6.35, roller: 3.3, width: 3.18, kgm: 0.14 }, '35': { p: 9.525, roller: 5.08, width: 4.77, kgm: 0.33 }, '40': { p: 12.7, roller: 7.92, width: 7.95, kgm: 0.62 },
  '06B': { p: 9.525, roller: 6.35, width: 5.72, kgm: 0.41 }, '08B': { p: 12.7, roller: 8.51, width: 7.75, kgm: 0.69 }, '10B': { p: 15.875, roller: 10.16, width: 9.65, kgm: 0.93 },
};
const chainOf = (w: string) => /(?:^|\s)(25|35|40|06B|08B|10B)(?=\s|$)/i.exec(w)?.[1]?.toUpperCase() ?? null;
const chain: Family = {
  id: 'chain', name: 'roller chain', path: ['Mechanical', 'Belts and chains', 'Roller chain'], says: 'roller chain of the ISO 606 B series or ANSI 25/35/40, any length (a whole number of links)',
  params: [{ key: 'series', says: 'chain', unit: '', values: Object.keys(CHAINS), default: '08B' }, { key: 'length', says: 'length', unit: 'm', min: 0.1, max: 20, default: 1 }],
  examples: ['chain 08B 1m', 'chain 25 0.5m', 'chain 40 2m'],
  read(w) { const c = chainOf(w); return c ? { series: c, length: metres(w, 1) } : `Which chain? ${Object.keys(CHAINS).join(', ')}.`; },
  make(p) { const c = String(p.series), C = CHAINS[c]!, L = Number(p.length), links = Math.max(2, Math.round((L * 1000) / C.p / 2) * 2); return item(`chain-${c.toLowerCase()}-${links}`, `roller chain ${c}, ${links} links`, 'Mechanical/Belts and chains/Roller chain', 'product', 'stamp', 'steel-alloy', 'plates stamped from strip, pins and bushes cold-headed, rollers formed; riveted together link by link', `${C.p} mm pitch, ${C.roller} mm rollers, ${C.width} mm inside; ${links} links, ${((links * C.p) / 1000).toFixed(2)} m; about ${C.kgm} kg/m`, [C.width + 4, (links * C.p), C.roller + 4], +(C.kgm * links * C.p).toFixed(0)); },
};
const sprocket: Family = {
  id: 'sprocket', name: 'chain sprocket', path: ['Mechanical', 'Belts and chains', 'Sprockets'], says: 'a sprocket for any chain above and any number of teeth: its pitch circle is p / sin(180° / z)',
  params: [{ key: 'series', says: 'chain', unit: '', values: Object.keys(CHAINS), default: '08B' }, { key: 'z', says: 'teeth', unit: '', min: 9, max: 120, default: 18 }, { key: 'bore', says: 'bore', unit: 'mm', min: 3, max: 60, default: 12 }],
  examples: ['sprocket 08B z18 bore12', 'sprocket 25 z11', 'sprocket 40 z40 bore20'],
  read(w) { const c = chainOf(w); if (!c) return `For which chain? ${Object.keys(CHAINS).join(', ')}.`; return { series: c, z: num(/\bz\s*(\d+)/i.exec(w)?.[1] ?? /(\d+)\s*(?:t|teeth)\b/i.exec(w)?.[1]) || 18, bore: num(/bore\s*(\d+(?:\.\d+)?)/i.exec(w)?.[1]) || 12 }; },
  make(p) { const c = String(p.series), C = CHAINS[c]!, z = Number(p.z), bore = Number(p.bore), D = C.p / Math.sin(Math.PI / z), Do = C.p * (0.6 + 1 / Math.tan(Math.PI / z)), t = 0.93 * C.width; return item(`sprocket-${c.toLowerCase()}-z${z}-b${bore}`, `sprocket ${c}, ${z} teeth`, 'Mechanical/Belts and chains/Sprockets', 'product', 'machine', 'steel-low', 'turned from bar, its teeth cut by hob and hardened at the tips', `pitch circle ${D.toFixed(1)} mm, outside ${Do.toFixed(1)} mm, ${t.toFixed(1)} mm thick, ${bore} mm bore`, [Do, Do, t], mm3g(Math.PI * ((D / 2) ** 2 - (bore / 2) ** 2) * t * 0.9, RHO.steel), 'cast'); },
};
/** Linear ball bushings, LM…UU: bore, outside, length (mm), the makers' common series. */
export const LM: Record<string, [number, number, number]> = { '3': [3, 7, 10], '4': [4, 8, 12], '5': [5, 10, 15], '6': [6, 12, 19], '8': [8, 15, 24], '10': [10, 19, 29], '12': [12, 21, 30], '16': [16, 28, 37], '20': [20, 32, 42] };
const linear: Family = {
  id: 'linear', name: 'linear ball bushing', path: ['Mechanical', 'Bearings', 'Linear bearings'], says: 'a linear ball bushing (LM…UU) for any shaft of the series: balls in a cage, rolling along the shaft',
  params: [{ key: 'd', says: 'shaft', unit: 'mm', values: Object.keys(LM).map(Number), default: 8 }],
  examples: ['linear LM8UU', 'linear bearing LM12UU', 'linear 6mm'],
  read(w) { const d = /LM\s*(\d+)/i.exec(w)?.[1] ?? /(\d+)\s*mm/i.exec(w)?.[1]; return d && LM[d] ? { d: Number(d) } : `For which shaft? ${Object.keys(LM).join(', ')} mm.`; },
  make(p) { const d = String(p.d), [b, D, L] = LM[d]!; return item(`lm${d}uu`, `linear bearing LM${d}UU (${b} × ${D} × ${L})`, 'Mechanical/Bearings/Linear bearings', 'product', 'grind', 'steel-chrome bearing-ball*24 pom', 'a ground steel sleeve, its balls recirculating in a plastic cage between its seals', `${b} mm shaft, ${D} mm outside, ${L} mm long`, [D, D, L], mm3g(Math.PI * ((D / 2) ** 2 - (b / 2) ** 2) * L * 0.6, RHO.steel)); },
};
/** NdFeB grades: remanence Br, T (the middle of each grade's range in makers' grade tables). */
export const NDFEB: Record<string, number> = { N35: 1.195, N38: 1.24, N42: 1.3, N45: 1.35, N48: 1.4, N50: 1.43, N52: 1.445 };
const magnet: Family = {
  id: 'magnet', name: 'neodymium disc magnet', path: ['Electrical', 'Magnets', 'Neodymium'], says: 'a nickel-plated NdFeB disc of any diameter, height and grade, magnetised through its height',
  params: [{ key: 'd', says: 'diameter', unit: 'mm', min: 1, max: 60, default: 10 }, { key: 'h', says: 'height', unit: 'mm', min: 0.5, max: 40, default: 3 }, { key: 'grade', says: 'grade', unit: '', values: Object.keys(NDFEB), default: 'N42' }],
  examples: ['magnet 10x3 N52', 'magnet 6x2', 'magnet 20x10 N35'],
  read(w) { const m = /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/.exec(w); if (!m) return 'A magnet as diameter × height: "magnet 10x3 N52".'; return { d: num(m[1]), h: num(m[2]), grade: /\bN(35|38|42|45|48|50|52)\b/i.exec(w)?.[0]?.toUpperCase() ?? 'N42' }; },
  make(p) { const d = Number(p.d), h = Number(p.h), gr = String(p.grade); return item(`magnet-${d}x${h}-${gr.toLowerCase()}`, `neodymium magnet ${d} × ${h} ${gr}`, 'Electrical/Magnets/Neodymium', 'product', 'sinter', 'ndfeb nickel', 'pressed from NdFeB powder in a field, sintered, ground, nickel-plated and magnetised', `${d} mm × ${h} mm, ${gr} (Br about ${NDFEB[gr]} T), axially magnetised`, [d, d, h], mm3g(Math.PI * (d / 2) ** 2 * h, 7.5)); },
};
/** ASME B36.10M steel pipe, schedule 40: outside diameter and wall, mm, by nominal size. */
export const NPS40: Record<string, [number, number]> = { '1/8': [10.3, 1.73], '1/4': [13.7, 2.24], '3/8': [17.1, 2.31], '1/2': [21.3, 2.77], '3/4': [26.7, 2.87], '1': [33.4, 3.38], '1-1/4': [42.2, 3.56], '1-1/2': [48.3, 3.68], '2': [60.3, 3.91], '3': [88.9, 5.49], '4': [114.3, 6.02] };
const pipe: Family = {
  id: 'pipe', name: 'pipe, schedule 40', path: ['Mechanical', 'Fluid power', 'Pipe'], says: 'pipe of any nominal size from 1/8" to 4", schedule 40 (ASME B36.10M; PVC to ASTM D1785 has the same outside and wall), any length',
  params: [{ key: 'nps', says: 'nominal size', unit: 'in', values: Object.keys(NPS40), default: '1/2' }, { key: 'length', says: 'length', unit: 'm', min: 0.05, max: 12, default: 1 }, { key: 'matter', says: 'made of', unit: '', values: ['steel', 'stainless', 'pvc'], default: 'steel' }],
  examples: ['pipe 1/2in 1m', 'pipe 2in 3m pvc', 'pipe 3/4 0.5m stainless'],
  read(w) { const n = /(\d-\d\/\d|\d\/\d|\d)\s*(?:in\b|"|inch|nps)?/i.exec(w.replace(/nps\s*/i, ''))?.[1]; if (!n || !NPS40[n]) return `Which size? ${Object.keys(NPS40).join(', ')} (inches, nominal).`; return { nps: n, length: metres(w.replace(/(\d-\d\/\d|\d\/\d)\s*(in\b|")?/, ''), 1), matter: /pvc/i.test(w) ? 'pvc' : /stainless/i.test(w) ? 'stainless' : 'steel' }; },
  make(p) { const n = String(p.nps), [OD, t] = NPS40[n]!, L = Number(p.length), mt = String(p.matter), rho = mt === 'pvc' ? 1.4 : mt === 'stainless' ? RHO.stainless : RHO.steel; return item(`pipe-${n.replace(/\//g, '_')}-${mt}-${L}m`, `${n}" ${mt} pipe, schedule 40, ${L} m`, 'Mechanical/Fluid power/Pipe', 'product', mt === 'pvc' ? 'extrude' : 'weld', mt === 'pvc' ? 'pvc' : mt === 'stainless' ? 'stainless-304' : 'steel-low', mt === 'pvc' ? 'extruded through a die and cut' : 'strip rolled into a tube and seam-welded, or pierced and drawn seamless', `${OD} mm outside, ${t} mm wall, ${(OD - 2 * t).toFixed(1)} mm inside`, [OD, OD, L * 1000], mm3g(Math.PI * (OD - t) * t * L * 1000, rho)); },
};
/** IPE beams (EN 10365): h, b, web, flange (mm); kg/m; Iy (cm⁴); Wy (cm³). */
export const IPE: Record<string, [number, number, number, number, number, number, number]> = {
  '80': [80, 46, 3.8, 5.2, 6.0, 80.1, 20.0], '100': [100, 55, 4.1, 5.7, 8.1, 171, 34.2], '120': [120, 64, 4.4, 6.3, 10.4, 318, 53.0], '140': [140, 73, 4.7, 6.9, 12.9, 541, 77.3],
  '160': [160, 82, 5.0, 7.4, 15.8, 869, 109], '180': [180, 91, 5.3, 8.0, 18.8, 1317, 146], '200': [200, 100, 5.6, 8.5, 22.4, 1943, 194],
};
const ibeam: Family = {
  id: 'ibeam', name: 'I-beam (IPE)', path: ['Hardware', 'Structural', 'Beams'], says: 'a hot-rolled steel IPE section from 80 to 200 mm deep (EN 10365), any length',
  params: [{ key: 'size', says: 'depth', unit: 'mm', values: Object.keys(IPE).map(Number), default: 160 }, { key: 'length', says: 'length', unit: 'm', min: 0.2, max: 18, default: 3 }],
  examples: ['ibeam IPE160 3m', 'ibeam IPE100 2m', 'ibeam IPE200 6m'],
  read(w) { const n = /IPE\s*(\d+)/i.exec(w)?.[1] ?? /(\d{2,3})\b/.exec(w)?.[1]; return n && IPE[n] ? { size: Number(n), length: metres(w.replace(/IPE\s*\d+/i, ''), 3) } : `Which IPE? ${Object.keys(IPE).join(', ')}.`; },
  make(p) { const n = String(p.size), [h, b, tw, tf, kgm, Iy] = IPE[n]!, L = Number(p.length); return item(`ipe${n}-${L}m`, `IPE ${n} beam, ${L} m`, 'Hardware/Structural/Beams', 'product', 'roll', 'steel-low', 'hot-rolled from a bloom through shaped rolls, straightened and cut', `${h} × ${b} mm, web ${tw}, flange ${tf} mm; ${kgm} kg/m; Iy ${Iy} cm⁴ (EN 10365); S235 or S355`, [b, L * 1000, h], Math.round(kgm * L * 1000)); },
};
/** JST connector series: pitch (mm) and the current each contact is rated for (A), from JST's datasheets. */
export const JST: Record<string, { pitch: number; amps: number }> = { SH: { pitch: 1.0, amps: 1 }, PH: { pitch: 2.0, amps: 2 }, XH: { pitch: 2.5, amps: 3 }, VH: { pitch: 3.96, amps: 10 } };
const jst: Family = {
  id: 'jst', name: 'JST wire-to-board connector', path: ['Electrical', 'Connectors', 'Wire-to-board'], says: 'a JST housing and its header, SH, PH, XH or VH, with any number of pins',
  params: [{ key: 'series', says: 'series', unit: '', values: Object.keys(JST), default: 'XH' }, { key: 'pins', says: 'pins', unit: '', min: 2, max: 16, default: 4 }],
  examples: ['jst XH 4', 'jst PH 2', 'jst SH 6'],
  read(w) { const s2 = /\b(SH|PH|XH|VH)\b/i.exec(w)?.[1]?.toUpperCase(); if (!s2) return `Which series? ${Object.keys(JST).join(', ')}.`; return { series: s2, pins: num(/(\d+)\s*(?:pins?|p\b|way)?/i.exec(w.replace(/\b(SH|PH|XH|VH)\b/i, ''))?.[1]) || 2 }; },
  make(p) { const s2 = String(p.series), n = Number(p.pins), J = JST[s2]!, w = J.pitch * (n - 1) + 2.5 * J.pitch; return item(`jst-${s2.toLowerCase()}-${n}`, `JST ${s2} connector, ${n} pins`, 'Electrical/Connectors/Wire-to-board', 'product', 'mould', `connector-housing crimp-contact*${n} header-insulator header-pin*${n}`, 'a moulded nylon housing with crimped, tin-plated phosphor-bronze contacts, and its header', `${J.pitch} mm pitch, ${n} ways, ${J.amps} A a contact (JST)`, [w, 6, 8], +(0.05 * n + 0.2).toFixed(2)); },
};
const header: Family = {
  id: 'header', name: 'pin header', path: ['Electrical', 'Connectors', 'Pin headers'], says: 'a 2.54 mm pin header of any rows and pins',
  params: [{ key: 'rows', says: 'rows', unit: '', min: 1, max: 3, default: 1 }, { key: 'pins', says: 'pins a row', unit: '', min: 1, max: 40, default: 8 }],
  examples: ['header 1x8', 'header 2x20', 'header 1x40'],
  read(w) { const m = /(\d+)\s*[x×]\s*(\d+)/.exec(w); return m ? { rows: num(m[1]), pins: num(m[2]) } : 'A header as rows × pins: "header 2x20".'; },
  make(p) { const r = Number(p.rows), n = Number(p.pins); return item(`header-${r}x${n}`, `pin header ${r} × ${n}, 2.54 mm`, 'Electrical/Connectors/Pin headers', 'product', 'mould', `header-insulator header-pin*${r * n}`, 'square brass pins, gold-flashed, held in a moulded PBT strip', `${r} × ${n} pins at 2.54 mm; about 3 A a pin`, [2.54 * n, 2.54 * r, 8.5], +(0.08 * r * n).toFixed(2)); },
};
const heater: Family = {
  id: 'heater', name: 'cartridge heater', path: ['Electrical', 'Heating', 'Cartridge heaters'], says: 'a cartridge heater of any diameter, length, voltage and power',
  params: [{ key: 'd', says: 'diameter', unit: 'mm', min: 3, max: 25, default: 6 }, { key: 'length', says: 'length', unit: 'mm', min: 10, max: 300, default: 20 }, { key: 'volts', says: 'voltage', unit: 'V', min: 5, max: 400, default: 24 }, { key: 'watts', says: 'power', unit: 'W', min: 5, max: 3000, default: 40 }],
  examples: ['heater 24V 40W 6x20', 'heater 12V 40W', 'heater 230V 200W 10x60'],
  read(w) { const m = /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/.exec(w); return { d: m ? num(m[1]) : 6, length: m ? num(m[2]) : 20, volts: num(/(\d+(?:\.\d+)?)\s*V\b/i.exec(w)?.[1]) || 24, watts: num(/(\d+(?:\.\d+)?)\s*W\b/i.exec(w)?.[1]) || 40 }; },
  make(p) { const d = Number(p.d), L = Number(p.length), V = Number(p.volts), W = Number(p.watts); return item(`heater-${d}x${L}-${V}v-${W}w`, `cartridge heater ${d} × ${L}, ${V} V ${W} W`, 'Electrical/Heating/Cartridge heaters', 'product', 'swage', 'heater-sheath resistance-wire terminal-pin*2 mgo', 'a nichrome coil in magnesium oxide inside a stainless sheath, swaged down so the powder packs tight', `${d} × ${L} mm; ${W} W at ${V} V, so ${((V * V) / W).toFixed(1)} Ω`, [d, d, L], mm3g(Math.PI * (d / 2) ** 2 * L, 5.5)); },
};
const thermistor: Family = {
  id: 'thermistor', name: 'NTC thermistor', path: ['Electrical', 'Sensors', 'Temperature'], says: 'an NTC thermistor of any resistance at 25 °C and β',
  params: [{ key: 'r25', says: 'resistance at 25 °C', unit: 'Ω', min: 100, max: 1e6, default: 100000 }, { key: 'beta', says: 'β', unit: 'K', min: 2000, max: 5000, default: 3950 }],
  examples: ['thermistor 100k B3950', 'thermistor 10k B3435', 'thermistor 100k'],
  read(w) { const m = /(\d+(?:\.\d+)?)\s*(k|M)?\b/i.exec(w); const r = m ? num(m[1]) * (m[2]?.toLowerCase() === 'k' ? 1e3 : m[2] === 'M' ? 1e6 : 1) : 1e5; return { r25: r, beta: num(/\bB\s*(\d{4})/i.exec(w)?.[1]) || 3950 }; },
  make(p) { const r = Number(p.r25), b = Number(p.beta), rs = r >= 1e3 ? `${r / 1e3}k` : String(r); return item(`ntc-${rs}-b${b}`, `NTC thermistor ${rs}Ω, β ${b}`, 'Electrical/Sensors/Temperature', 'product', 'sinter', 'ntc-bead lead-wire*2 glass-body', 'a bead of metal-oxide ceramic sintered onto two leads and sealed in glass', `${rs}Ω at 25 °C, β ${b} K`, [2, 2, 4], 0.1); },
};
const coupling: Family = {
  id: 'coupling', name: 'flexible shaft coupling', path: ['Mechanical', 'Shafts and hubs', 'Couplings'], says: 'a helical-beam coupling joining any two shafts up to 12 mm, held by set screws',
  params: [{ key: 'd1', says: 'first bore', unit: 'mm', min: 2, max: 12, default: 5 }, { key: 'd2', says: 'second bore', unit: 'mm', min: 2, max: 12, default: 8 }],
  examples: ['coupling 5x8', 'coupling 5x5', 'coupling 8x10'],
  read(w) { const m = /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/.exec(w); return m ? { d1: num(m[1]), d2: num(m[2]) } : 'A coupling as bore × bore: "coupling 5x8".'; },
  make(p) { const a = Number(p.d1), b = Number(p.d2), big = Math.max(a, b) > 8, D = big ? 25 : 19, L = big ? 30 : 25; return item(`coupling-${a}x${b}`, `shaft coupling ${a} × ${b} mm`, 'Mechanical/Shafts and hubs/Couplings', 'product', 'machine', 'al-6061 screw-set*4', 'turned from aluminium bar, a helix cut through its middle so it bends and twists a little', `${a} and ${b} mm bores, ${D} mm outside, ${L} mm long (a typical size for these bores)`, [D, D, L], mm3g(Math.PI * ((D / 2) ** 2 * L - (a / 2) ** 2 * L / 2 - (b / 2) ** 2 * L / 2), RHO.aluminium), 'print'); },
};

/** The families written out by hand, each with its own reading of words. */
export const HAND_FAMILIES: Family[] = [screw, nut, washer, bearing, gear, spring, wire, extrusion, resistor, stepper, cell, pulley, leadscrew, led, oring, dcmotor, servo, fan, rail, rod, tube, threadedrod, sheet, pack, capacitor, standoff, insert, belt, pcb, bolt, setscrew, dowel, circlip, key, chain, sprocket, linear, magnet, pipe, ibeam, jst, header, heater, thermistor, coupling];
/** Every family: those by hand, then every kind of bought part made from its table. */
export const FAMILIES: Family[] = [...HAND_FAMILIES, ...KINDS.map(familyOf)];
/** A family called with its sizes, in words ("screw M4x20", "bearing 6201 2RS"): the item it gives, or why not. */
export function callFamily(words: string): Item | string | null {
  const w = words.trim(), f = FAMILIES.find((x) => new RegExp(`^${x.id}s?\\b`, 'i').test(w)) ?? (/^M\d/i.test(w) && /x\d/i.test(w) ? screw : null);
  if (!f) return null;
  if (f.kind && !w.replace(new RegExp(`^${f.id}s?\\b`, 'i'), '').trim()) return null;
  const p = f.read(w.replace(new RegExp(`^${f.id}s?\\b`, 'i'), '').trim() || w); if (typeof p === 'string') return p;
  for (const q of f.params) if (q.min !== undefined && typeof p[q.key] === 'number' && ((p[q.key] as number) < q.min || (p[q.key] as number) > q.max!)) return `${q.says} must be ${q.min}–${q.max} ${q.unit}.`;
  return { ...f.make(p), sized: { family: f.id, params: p } };
}
// a kind's parts made to their own sizes are called by their families' words
useFamilies(callFamily);
