// Adjustable parts: one entry for every size of a kind of part, not one entry for each size. A family is called with
// its sizes ("screw M4x20", "bearing 6201", "gear m1 z30 b8", "spring d1 D10 L30 n8", "wire 22AWG 2m") and gives an
// item of the inventory made to them: its name, its standard numbers worked out from the standard's tables or its
// law, what it is made of, how it is made, its size and its mass (from its nominal shape and its material's density).
// Tables are the standards' (ISO 261 pitches, ISO 4762 heads, ISO 4032 nuts, ISO 7089 washers, ISO 15 bearing sizes,
// the AWG formula, NEMA ICS 16 faces); laws are the textbooks' (a spring's rate, a gear's pitch circle).

import type { Item, Process } from './inventory';

export interface Param { key: string; says: string; unit: string; values?: (string | number)[]; min?: number; max?: number; default: string | number }
export interface Family { id: string; name: string; path: string[]; says: string; params: Param[]; examples: string[]; /** its sizes read from words, or why not */ read(words: string): Record<string, string | number> | string; make(p: Record<string, string | number>): Item }

const RHO = { steel: 7.85, stainless: 8.0, brass: 8.5, aluminium: 2.7, copper: 8.96, pla: 1.24, pom: 1.41 }; // g/cm³
const mm3g = (mm3: number, rho: number) => +((mm3 / 1000) * rho).toFixed(2);
const item = (id: string, name: string, path: string, kind: Item['kind'], make: Process, of: string, says: string, spec: string, size: [number, number, number], g: number, alt?: Process): Item =>
  ({ id, name, path: path.split('/'), kind, make, of: of.split(/\s+/).filter(Boolean).map((x) => { const [c, n] = x.split('*'); return { id: c!, n: Number(n ?? 1) }; }), says, spec, size, g, ...(alt ? { alt } : {}), adjustable: true } as Item);
/** A number from words: "M4", "x20", "20mm", "m1", "z30". */
const num = (s: string | undefined) => (s === undefined ? NaN : Number(s.replace(/,/g, '.')));

// ---- metric threads (ISO 261 coarse pitch; ISO 4762 socket heads; ISO 4032 nuts; ISO 7089 washers) ------------------
export const METRIC: Record<string, { p: number; dk: number; k: number; s: number; m: number; d1: number; d2: number; h: number }> = {
  M2: { p: 0.4, dk: 3.8, k: 2, s: 4, m: 1.6, d1: 2.2, d2: 5, h: 0.3 }, 'M2.5': { p: 0.45, dk: 4.5, k: 2.5, s: 5, m: 2, d1: 2.7, d2: 6, h: 0.5 },
  M3: { p: 0.5, dk: 5.5, k: 3, s: 5.5, m: 2.4, d1: 3.2, d2: 7, h: 0.5 }, M4: { p: 0.7, dk: 7, k: 4, s: 7, m: 3.2, d1: 4.3, d2: 9, h: 0.8 },
  M5: { p: 0.8, dk: 8.5, k: 5, s: 8, m: 4.7, d1: 5.3, d2: 10, h: 1 }, M6: { p: 1, dk: 10, k: 6, s: 10, m: 5.2, d1: 6.4, d2: 12, h: 1.6 },
  M8: { p: 1.25, dk: 13, k: 8, s: 13, m: 6.8, d1: 8.4, d2: 16, h: 1.6 }, M10: { p: 1.5, dk: 16, k: 10, s: 16, m: 8.4, d1: 10.5, d2: 20, h: 2 },
  M12: { p: 1.75, dk: 18, k: 12, s: 18, m: 10.8, d1: 13, d2: 24, h: 2.5 },
};
const thread = (w: string) => { const m = /\bM(\d+(?:\.\d)?)(?![\d.])/i.exec(w); return m ? `M${m[1]}` : null; };
const screw: Family = {
  id: 'screw', name: 'socket head cap screw', path: ['Hardware', 'Fasteners', 'Screws'], says: 'any metric size and length, with its pitch and head from ISO 261 and ISO 4762',
  params: [{ key: 'thread', says: 'thread size', unit: '', values: Object.keys(METRIC), default: 'M3' }, { key: 'length', says: 'length under the head', unit: 'mm', min: 3, max: 200, default: 10 }, { key: 'class', says: 'strength class', unit: '', values: ['8.8', '10.9', '12.9', 'A2'], default: '12.9' }],
  examples: ['screw M3x10', 'screw M4x20', 'screw M5x16 A2', 'screw M8x40'],
  read(w) { const t = thread(w); if (!t || !METRIC[t]) return `Which thread? ${Object.keys(METRIC).join(', ')}.`; const L = num(/[x×]\s*(\d+(?:\.\d+)?)/i.exec(w)?.[1] ?? /(\d+(?:\.\d+)?)\s*mm/i.exec(w)?.[1]) || 10; const cl = /\b(8\.8|10\.9|12\.9|A2)\b/i.exec(w)?.[1]?.toUpperCase() ?? '12.9'; return { thread: t, length: L, class: cl }; },
  make(p) {
    const t = String(p.thread), L = Number(p.length), d = num(t.slice(1)), T = METRIC[t]!, a2 = p.class === 'A2';
    const v = Math.PI * (d / 2) ** 2 * L * 0.92 + Math.PI * (T.dk / 2) ** 2 * T.k * 0.85;
    return item(`screw-${t.toLowerCase()}x${L}${a2 ? '-a2' : ''}`, `${t} × ${L} socket head cap screw${a2 ? ', stainless' : ''}`, 'Hardware/Fasteners/Screws', 'product', 'roll-thread', a2 ? 'stainless-304' : 'steel-alloy', `${a2 ? 'stainless wire' : 'alloy steel wire'} cold-headed to its head and hex socket, its thread rolled${a2 ? '' : ', hardened and tempered, black-oxided'}`, `ISO 4762, class ${p.class}; ${T.p} mm pitch (ISO 261); head ${T.dk} mm across, ${T.k} mm high; a ${t === 'M3' ? '2.5' : t === 'M4' ? '3' : t === 'M5' ? '4' : t === 'M6' ? '5' : t === 'M8' ? '6' : t === 'M2' ? '1.5' : t === 'M2.5' ? '2' : t === 'M10' ? '8' : '10'} mm hex key`, [T.dk, T.dk, L + T.k], mm3g(v, a2 ? RHO.stainless : RHO.steel));
  },
};
const nut: Family = {
  id: 'nut', name: 'hex nut', path: ['Hardware', 'Fasteners', 'Nuts'], says: 'any metric size, its width across flats and height from ISO 4032; nylon lock (ISO 10511) if asked', params: [{ key: 'thread', says: 'thread size', unit: '', values: Object.keys(METRIC), default: 'M3' }, { key: 'lock', says: 'with a nylon ring', unit: '', values: ['no', 'yes'], default: 'no' }],
  examples: ['nut M3', 'nut M5 lock', 'nut M8'],
  read(w) { const t = thread(w); if (!t) return `Which thread? ${Object.keys(METRIC).join(', ')}.`; return { thread: t, lock: /lock|nyloc|nylon/i.test(w) ? 'yes' : 'no' }; },
  make(p) { const t = String(p.thread), T = METRIC[t]!, d = num(t.slice(1)), lock = p.lock === 'yes', v = ((3 * Math.sqrt(3)) / 2) * (T.s / Math.sqrt(3)) ** 2 * T.m - Math.PI * (d / 2) ** 2 * T.m;
    return item(`nut-${t.toLowerCase()}${lock ? '-lock' : ''}`, `${t} hex nut${lock ? ', nylon lock' : ''}`, 'Hardware/Fasteners/Nuts', 'product', 'cold-head', lock ? 'steel-low zinc nylon' : 'steel-low zinc', 'cold-formed from wire, pierced and tapped, zinc-plated', `${lock ? 'ISO 10511' : 'ISO 4032'}; ${T.s} mm across flats, ${T.m} mm high; ${T.p} mm pitch`, [T.s, T.s, T.m], mm3g(v, RHO.steel)); },
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
};
const bearing: Family = {
  id: 'bearing', name: 'deep-groove ball bearing', path: ['Mechanical', 'Bearings', 'Ball bearings'], says: 'any bearing number of the 62x, 60xx and 62xx series, its bore, outside and width from ISO 15', params: [{ key: 'number', says: 'bearing number', unit: '', values: Object.keys(BEARINGS), default: '608' }, { key: 'seal', says: 'shields or seals', unit: '', values: ['ZZ', '2RS', 'open'], default: 'ZZ' }],
  examples: ['bearing 608', 'bearing 6201 2RS', 'bearing 625'],
  read(w) { const n = /\b(6\d{2,3})\b/.exec(w)?.[1]; if (!n || !BEARINGS[n]) return `Which bearing? ${Object.keys(BEARINGS).join(', ')}.`; return { number: n, seal: /2rs/i.test(w) ? '2RS' : /open/i.test(w) ? 'open' : 'ZZ' }; },
  make(p) { const n = String(p.number), [d, D, B] = BEARINGS[n]!, v = Math.PI * ((D / 2) ** 2 - (d / 2) ** 2) * B * 0.55; return item(`bearing-${n}${p.seal === 'ZZ' ? 'zz' : String(p.seal).toLowerCase()}`, `ball bearing ${n}${p.seal === 'open' ? '' : ` ${p.seal}`} (${d} × ${D} × ${B})`, 'Mechanical/Bearings/Ball bearings', 'product', 'assemble', `bearing-ring*2 bearing-ball*${Math.max(6, Math.round((Math.PI * (d + D) / 2) / ((D - d) * 0.3 * 2)))} bearing-cage ${p.seal === 'open' ? '' : p.seal === '2RS' ? 'nbr*2' : 'bearing-shield*2'} grease`, `two rings and a row of balls in a cage${p.seal === 'open' ? '' : p.seal === '2RS' ? ', rubber seals both sides' : ', steel shields both sides'}, greased`, `${d} mm bore, ${D} mm outside, ${B} mm wide (ISO 15); balls counted from its size (typical)`, [D, D, B], mm3g(v, RHO.steel)); },
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
    return item(`wire-${n}awg-${L}m`, `${n} AWG hook-up wire, ${L} m`, 'Electrical/Wiring and connectors/Wire', 'product', 'extrude', 'copper pvc', 'copper strands in PVC insulation', `${d.toFixed(3)} mm copper (${A.toFixed(3)} mm²); ${(R * 1000).toFixed(1)} mΩ over ${L} m at 20 °C (ρ 1.72 × 10⁻⁸ Ω·m)`, [d + 1.2, d + 1.2, L * 1000], mm3g(A * L * 1000, RHO.copper) + mm3g(Math.PI * (((d + 1.2) / 2) ** 2 - (d / 2) ** 2) * L * 1000, 1.4)); },
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
  make(p) { const R = Number(p.ohms), W = Number(p.watts), say = R >= 1e6 ? `${R / 1e6} MΩ` : R >= 1e3 ? `${R / 1e3} kΩ` : `${R} Ω`, L = W <= 0.25 ? 6.3 : W <= 0.5 ? 9 : 12, D = W <= 0.25 ? 2.5 : W <= 0.5 ? 3.5 : 5;
    return item(`resistor-${R}-${W}w`, `${say} resistor, ${W} W`, 'Electrical/Passive components/Resistors', 'product', 'assemble', 'alumina nichrome lead-wire*2 epoxy', 'a metal film on a ceramic rod, a spiral cut to set its value, end caps, leads, a lacquer coat', `${say} ±1 %; carries up to ${Math.sqrt(W / R).toFixed(4)} A at ${W} W (I = √(P/R)); ${L} × ${D} mm body (typical)`, [D, D, L], 0.3); },
};
// ---- stepper motors by NEMA frame (face sizes, NEMA ICS 16) -------------------------------------------------------------
const NEMA: Record<string, number> = { '8': 20.3, '11': 28.2, '14': 35.2, '17': 42.3, '23': 57.15, '34': 86 };
const stepper: Family = {
  id: 'stepper', name: 'stepper motor', path: ['Electrical', 'Motors and actuators', 'Stepper motors'], says: 'any NEMA frame and body length, 1.8° a step', params: [{ key: 'nema', says: 'frame', unit: 'NEMA', values: Object.keys(NEMA), default: '17' }, { key: 'length', says: 'body length', unit: 'mm', min: 20, max: 120, default: 40 }],
  examples: ['stepper nema17 40', 'stepper nema23 56', 'stepper nema14 34'],
  read(w) { const n = /nema\s*(\d+)/i.exec(w)?.[1] ?? '17'; if (!NEMA[n]) return `Which frame? NEMA ${Object.keys(NEMA).join(', ')}.`; const L = num(/\b(\d{2,3})\s*(?:mm)?\s*$/.exec(w.replace(/nema\s*\d+/i, ''))?.[1]) || 40; return { nema: n, length: L }; },
  make(p) { const n = String(p.nema), F = NEMA[n]!, L = Number(p.length), g = mm3g(F * F * L * 0.75, RHO.steel);
    return item(`stepper-nema${n}-${L}`, `NEMA ${n} stepper, ${L} mm`, 'Electrical/Motors and actuators/Stepper motors', 'product', 'assemble', `stator-stepper rotor-stepper end-bell*2 bearing-625*2 screw-m3*4 jst-xh`, 'two phases of coils on a toothed stator, a toothed magnet rotor, end bells, two bearings', `${F} mm face (NEMA ICS 16); 1.8° a step (200 a turn); holding torque grows with body length; mass from its shape: about ${g} g`, [F, F, L], g); },
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
const pulley: Family = {
  id: 'pulley', name: 'GT2 pulley', path: ['Mechanical', 'Linear motion', 'Belts and pulleys'], says: 'any number of teeth: 2 mm of belt a tooth; pitch diameter teeth × 2 / π', params: [{ key: 'teeth', says: 'teeth', unit: '', min: 12, max: 80, default: 20 }, { key: 'bore', says: 'bore', unit: 'mm', min: 3, max: 12, default: 5 }],
  examples: ['pulley 20t 5mm', 'pulley 16t 5mm', 'pulley 60t 8mm'],
  read(w) { const t = num(/(\d+)\s*t\b/i.exec(w)?.[1] ?? /(\d+)\s*teeth/i.exec(w)?.[1]) || 20, b = num(/(\d+)\s*mm/i.exec(w)?.[1]) || 5; return { teeth: t, bore: b }; },
  make(p) { const t = Number(p.teeth), b = Number(p.bore), pd = (t * 2) / Math.PI; return item(`pulley-gt2-${t}t-${b}`, `GT2 pulley, ${t} teeth, ${b} mm bore`, 'Mechanical/Linear motion/Belts and pulleys', 'product', 'machine', 'al-6061 screw-set*2', 'an aluminium pulley for a 2 mm pitch belt, held by two set screws', `pitch diameter ${pd.toFixed(2)} mm; ${2 * t} mm of belt a turn`, [pd + 4, pd + 4, 16], mm3g(Math.PI * ((pd + 4) / 2) ** 2 * 16 * 0.7, RHO.aluminium), 'print'); },
};
const leadscrew: Family = {
  id: 'leadscrew', name: 'lead screw', path: ['Mechanical', 'Linear motion', 'Screws'], says: 'any diameter, pitch, starts and length: its lead is pitch × starts', params: [{ key: 'd', says: 'diameter', unit: 'mm', values: [5, 6, 8, 10, 12], default: 8 }, { key: 'pitch', says: 'pitch', unit: 'mm', min: 1, max: 5, default: 2 }, { key: 'starts', says: 'starts', unit: '', min: 1, max: 4, default: 4 }, { key: 'length', says: 'length', unit: 'mm', min: 50, max: 1500, default: 300 }],
  examples: ['leadscrew T8 p2 s4 300', 'leadscrew T8 p2 s1 400', 'leadscrew T12 p3 s1 500'],
  read(w) { const d = num(/T\s*(\d+)/i.exec(w)?.[1]) || 8, p = num(/\bp\s*(\d+(?:\.\d+)?)/i.exec(w)?.[1]) || 2, s = num(/\bs\s*(\d)/i.exec(w)?.[1]) || 4, L = num(/\b(\d{2,4})\s*(?:mm)?\s*$/.exec(w)?.[1]) || 300; return { d, pitch: p, starts: s, length: L }; },
  make(p) { const d = Number(p.d), pi = Number(p.pitch), s = Number(p.starts), L = Number(p.length), lead = pi * s; return item(`leadscrew-t${d}-p${pi}-s${s}-${L}`, `T${d} lead screw, lead ${lead} mm, ${L} mm`, 'Mechanical/Linear motion/Screws', 'product', 'roll-thread', 'stainless-304 brass', 'a rolled-thread stainless screw with its brass nut', `lead ${lead} mm a turn (pitch ${pi} × ${s} start${s > 1 ? 's' : ''}); on a 1.8° stepper ${(lead / 200).toFixed(3)} mm a full step; ${s === 1 ? 'self-locking: it does not back-drive' : 'fast, and it can back-drive'}`, [d, d, L], mm3g(Math.PI * (d / 2) ** 2 * L * 0.8, RHO.stainless)); },
};
const led: Family = {
  id: 'led', name: 'LED', path: ['Electrical', 'Semiconductors', 'LEDs'], says: 'any colour and size; its forward voltage typical of its die', params: [{ key: 'colour', says: 'colour', unit: '', values: ['red', 'yellow', 'green', 'blue', 'white'], default: 'red' }, { key: 'size', says: 'size', unit: 'mm', values: [3, 5, 10], default: 5 }],
  examples: ['led red 5mm', 'led white 3mm', 'led blue 10mm'],
  read(w) { const c = /(red|yellow|green|blue|white)/i.exec(w)?.[1]?.toLowerCase() ?? 'red', s = num(/(\d+)\s*mm/i.exec(w)?.[1]) || 5; return { colour: c, size: s }; },
  make(p) { const c = String(p.colour), s = Number(p.size), vf = c === 'red' || c === 'yellow' ? 2 : 3.1, die = c === 'red' || c === 'yellow' ? 'si-die' : 'gan'; return item(`led-${c}-${s}mm`, `${c} LED, ${s} mm`, 'Electrical/Semiconductors/LEDs', 'product', 'assemble', `${die} lead-frame bond-wire epoxy`, `a ${c === 'red' || c === 'yellow' ? 'AlGaInP' : 'InGaN'} die in a reflector cup, a bond wire to the other lead, cast in an epoxy lens`, `about ${vf} V forward at 20 mA (typical); a series resistor of (V − ${vf}) / 0.02 Ω`, [s, s, s * 1.7], 0.3); },
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
const rail: Family = {
  id: 'rail', name: 'miniature linear rail', path: ['Mechanical', 'Linear motion', 'Rails'], says: 'MGN7, 9, 12 or 15, any length, with its carriage', params: [{ key: 'size', says: 'rail width', unit: 'mm', values: [7, 9, 12, 15], default: 12 }, { key: 'length', says: 'length', unit: 'mm', min: 50, max: 2000, default: 400 }],
  examples: ['rail MGN12 400', 'rail MGN9 300', 'rail MGN15 1000'],
  read(w) { const sz = num(/mgn\s*(\d+)/i.exec(w)?.[1]) || 12, L = num(/\b(\d{2,4})\s*(?:mm)?\s*$/.exec(w.replace(/mgn\s*\d+/i, ''))?.[1]) || 400; return [7, 9, 12, 15].includes(sz) ? { size: sz, length: L } : 'Which size? MGN7, 9, 12, 15.'; },
  make(p) { const sz = Number(p.size), L = Number(p.length); return item(`rail-mgn${sz}-${L}`, `MGN${sz} rail, ${L} mm, with carriage`, 'Mechanical/Linear motion/Rails', 'product', 'assemble', 'steel-chrome*2 bearing-ball*40 pom nbr grease', 'a ground steel rail and a carriage whose balls roll along it and come back round through its end caps', `${sz} mm wide rail; holes every ${sz <= 9 ? 20 : sz === 12 ? 25 : 40} mm (typical)`, [sz, sz * 0.75, L], mm3g(sz * sz * 0.75 * L * 0.85, RHO.steel)); },
};
// ---- round stock: shafts, rods, tubes, threaded rod -----------------------------------------------------------------
const MAT: Record<string, [string, number, string]> = { steel: ['steel-low', RHO.steel, 'steel'], stainless: ['stainless-304', RHO.stainless, 'stainless'], aluminium: ['al-6061', RHO.aluminium, 'aluminium'], brass: ['brass', RHO.brass, 'brass'], copper: ['copper', RHO.copper, 'copper'] };
const matOf = (w: string) => /stainless|304/i.test(w) ? 'stainless' : /alumin/i.test(w) ? 'aluminium' : /brass/i.test(w) ? 'brass' : /copper/i.test(w) ? 'copper' : 'steel';
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
    return item(`capacitor-${say.replace(/[^\w]/g, '')}-${V}v`, `${say} capacitor, ${V} V`, 'Electrical/Passive components/Capacitors', 'product', el ? 'assemble' : 'sinter', el ? 'al-foil*2 paper electrolyte-al lead-wire*2 rubber al-6061' : 'batio3 nickel tin', el ? 'aluminium foils and paper soaked in electrolyte, wound and sealed in a can' : 'ceramic layers and nickel electrodes fired together', `${say}, rated ${V} V; holds ${E < 1e-3 ? `${(E * 1e6).toFixed(1)} µJ` : `${E.toFixed(3)} J`} at that (½ C V²)${el ? '; polarised: mind its stripe' : ''}`, el ? [Math.max(5, Math.cbrt(F * 1e6 * V) * 2.2), Math.max(5, Math.cbrt(F * 1e6 * V) * 2.2), Math.max(7, Math.cbrt(F * 1e6 * V) * 3.5)] : [3.2, 1.6, 1.2], el ? +(Math.cbrt(F * 1e6 * V) * 0.6).toFixed(1) : 0.01); },
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
  make(p) { const L = Number(p.length), W = Number(p.width), loop = p.loop === 'yes'; return item(`belt-gt2-${L}-${W}${loop ? '-loop' : ''}`, `GT2 belt ${W} mm, ${L} mm${loop ? ' loop' : ''}`, 'Mechanical/Linear motion/Belts and pulleys', 'product', 'mould', 'neoprene fibreglass', 'a toothed belt of neoprene round glass-fibre cords', `2 mm pitch${loop ? `, ${L / 2} teeth round` : ''}; ${W} mm wide`, [W, 1.4, L], mm3g(W * 1.4 * L, 1.3)); },
};
const pcb: Family = {
  id: 'pcb', name: 'circuit board', path: ['Electrical', 'Boards and controllers', 'Circuit boards'], says: 'any size, layer count and thickness', params: [{ key: 'w', says: 'width', unit: 'mm', min: 5, max: 500, default: 50 }, { key: 'h', says: 'height', unit: 'mm', min: 5, max: 500, default: 50 }, { key: 'layers', says: 'copper layers', unit: '', values: [1, 2, 4, 6, 8], default: 2 }, { key: 't', says: 'thickness', unit: 'mm', values: [0.8, 1.0, 1.2, 1.6, 2.0], default: 1.6 }],
  examples: ['pcb 50x50 2 layers', 'pcb 100x80 4 layers 1.6mm'],
  read(w) { const m = /(\d+)\s*[x×]\s*(\d+)/.exec(w); return { w: num(m?.[1]) || 50, h: num(m?.[2]) || 50, layers: num(/(\d)\s*layers?/i.exec(w)?.[1]) || 2, t: num(/(\d(?:\.\d)?)\s*mm/i.exec(w)?.[1]) || 1.6 }; },
  make(p) { const w = Number(p.w), h = Number(p.h), L = Number(p.layers), t = Number(p.t); return item(`pcb-${w}x${h}-${L}l-${t}`, `circuit board ${w} × ${h} mm, ${L} layers`, 'Electrical/Boards and controllers/Circuit boards', 'part', 'etch', `fr4 copper-foil*${L} solder-mask tin`, `FR-4 with ${L} layers of copper etched to traces, plated holes joining them, solder mask and tinned pads`, `${w} × ${h} × ${t} mm; 35 µm copper a layer (1 oz) typical`, [w, h, t], mm3g(w * h * t, 1.85)); },
};

export const FAMILIES: Family[] = [screw, nut, washer, bearing, gear, spring, wire, extrusion, resistor, stepper, cell, pulley, leadscrew, led, oring, dcmotor, servo, fan, rail, rod, tube, threadedrod, sheet, pack, capacitor, standoff, insert, belt, pcb];
/** A family called with its sizes, in words ("screw M4x20", "bearing 6201 2RS"): the item it gives, or why not. */
export function callFamily(words: string): Item | string | null {
  const w = words.trim(), f = FAMILIES.find((x) => new RegExp(`^${x.id}s?\\b`, 'i').test(w)) ?? (/^M\d/i.test(w) && /x\d/i.test(w) ? screw : null);
  if (!f) return null;
  const p = f.read(w.replace(new RegExp(`^${f.id}s?\\b`, 'i'), '').trim() || w); if (typeof p === 'string') return p;
  for (const q of f.params) if (q.min !== undefined && typeof p[q.key] === 'number' && ((p[q.key] as number) < q.min || (p[q.key] as number) > q.max!)) return `${q.says} must be ${q.min}–${q.max} ${q.unit}.`;
  return f.make(p);
}
