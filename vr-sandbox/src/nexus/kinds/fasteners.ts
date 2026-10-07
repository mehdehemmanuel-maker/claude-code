// Fasteners and hardware sold by the thousand: screws of every head, nuts, washers, pins, rivets, rings, plugs, ties,
// and the hardware of doors, drawers and cabinets. Sizes from their standards where they have one (ISO, DIN); where
// they have not, the sizes makers list, said to be typical.

import { METRIC } from '../threads';
import { ax, bare, cyl, gOf, hexPrism, matOf, pref, ring, unit, type KindDef, type P } from './core';

const T = (p: P) => METRIC[String(p.thread)]!;
const dOf = (p: P) => Number(String(p.thread).slice(1));
const threads = (from: string, to: string) => { const ks = Object.keys(METRIC), a = ks.indexOf(from), b = ks.indexOf(to); return ks.slice(a, b + 1); };
const madeOf = (p: P) => matOf(p.matter);
/** A screw's mass: its shank (a little under the full diameter, for the thread) and its head. */
const screwG = (p: P, head: number) => gOf(cyl(dOf(p), Number(p.L)) * 0.92 + head, madeOf(p)[1]);

export const FASTENERS: KindDef[] = [
  {
    id: 'countersunk', name: 'countersunk socket screw', path: 'Hardware/Fasteners/Countersunk screws', says: 'a flat-head screw with a hex socket, its 90° head sunk flush in a countersink', std: 'ISO 10642, M3–M20, in the lengths the standard gives each',
    axes: [bare('thread', 'thread', threads('M3', 'M20')), ax('L', 'length', 'mm', (p) => pref(...(({ M3: [6, 30], M4: [8, 40], M5: [8, 50], M6: [8, 60], M8: [10, 80], M10: [12, 100], M12: [20, 100], M14: [25, 100], M16: [30, 100], M20: [35, 100] } as Record<string, [number, number]>)[String(p.thread)] ?? [10, 50]))), bare('matter', 'made of', ['black', 'A2', 'A4'])],
    title: (p) => `${p.thread} × ${p.L} countersunk socket screw, ${madeOf(p)[2]}`, of: (p) => madeOf(p)[0], make: 'roll-thread', how: (p) => `cold-headed from ${madeOf(p)[2]} wire, its socket punched and its thread rolled${p.matter === 'black' ? ', hardened to class 10.9 and black-oxided' : ''}`,
    spec: (p) => `${T(p).p} mm pitch; head ${(2.24 * dOf(p)).toFixed(1)} mm across, ${(0.62 * dOf(p)).toFixed(1)} mm deep at 90°; ${p.matter === 'black' ? 'class 10.9' : p.matter === 'A2' ? 'A2-70' : 'A4-70'}`,
    box: (p) => [2.24 * dOf(p), 2.24 * dOf(p), Number(p.L)], g: (p) => screwG(p, (Math.PI / 12) * 0.62 * dOf(p) * ((2.24 * dOf(p)) ** 2 + 2.24 * dOf(p) ** 2 + dOf(p) ** 2) * 0.85),
  },
  {
    id: 'buttonhead', name: 'button head socket screw', path: 'Hardware/Fasteners/Button head screws', says: 'a low domed head with a hex socket, for a smooth outside', std: 'ISO 7380-1, M3–M16',
    axes: [bare('thread', 'thread', threads('M3', 'M16')), ax('L', 'length', 'mm', (p) => pref(Math.max(4, dOf(p)), Math.min(60, 12 * dOf(p)))), bare('matter', 'made of', ['black', 'A2'])],
    title: (p) => `${p.thread} × ${p.L} button head screw, ${madeOf(p)[2]}`, of: (p) => madeOf(p)[0], make: 'roll-thread', how: (p) => `cold-headed from ${madeOf(p)[2]} wire, thread-rolled${p.matter === 'black' ? ', hardened (10.9) and black-oxided' : ''}`,
    spec: (p) => { const BH: Record<string, [number, number]> = { M3: [5.7, 1.65], M4: [7.6, 2.2], M5: [9.5, 2.75], M6: [10.5, 3.3], M8: [14, 4.4], M10: [17.5, 5.5], M12: [21, 6.6], M14: [24.5, 7.7], M16: [28, 8.8] }; const [dk, k] = BH[String(p.thread)]!; return `${T(p).p} mm pitch; head ${dk} mm across, ${k} mm high (ISO 7380-1)`; },
    box: (p) => [1.75 * dOf(p) + 0.5, 1.75 * dOf(p) + 0.5, Number(p.L) + 0.55 * dOf(p)], g: (p) => screwG(p, (Math.PI / 4) * (1.75 * dOf(p)) ** 2 * 0.55 * dOf(p) * 0.55),
  },
  {
    id: 'panhead', name: 'pan head screw, cross recess', path: 'Hardware/Fasteners/Machine screws', says: 'a rounded flat head with a Phillips (H) or Pozidriv (Z) recess', std: 'ISO 7045, M1.6–M8',
    axes: [bare('thread', 'thread', threads('M1.6', 'M8')), ax('L', 'length', 'mm', (p) => pref(Math.max(2, dOf(p)), Math.min(60, 12 * dOf(p)))), bare('drive', 'recess', ['PH', 'PZ']), bare('matter', 'made of', ['zinc', 'A2'])],
    title: (p) => `${p.thread} × ${p.L} pan head screw, ${p.drive}, ${madeOf(p)[2]}`, of: (p) => madeOf(p)[0], make: 'roll-thread', how: (p) => `cold-headed with its ${p.drive === 'PH' ? 'Phillips' : 'Pozidriv'} recess, thread-rolled${p.matter === 'zinc' ? ', class 4.8, zinc-plated' : ''}`,
    spec: (p) => `${T(p).p} mm pitch; head about ${(2 * dOf(p)).toFixed(1)} mm across, ${(0.7 * dOf(p)).toFixed(1)} mm high (ISO 7045)`, box: (p) => [2 * dOf(p), 2 * dOf(p), Number(p.L) + 0.7 * dOf(p)], g: (p) => screwG(p, cyl(2 * dOf(p), 0.7 * dOf(p)) * 0.8),
  },
  {
    id: 'carriagebolt', name: 'carriage bolt', path: 'Hardware/Fasteners/Bolts', says: 'a domed head over a square neck that bites into wood so the bolt cannot turn', std: 'DIN 603, M5–M12',
    axes: [bare('thread', 'thread', threads('M5', 'M12')), ax('L', 'length', 'mm', (p) => pref(16, Math.min(200, 20 * dOf(p)))), bare('matter', 'made of', ['zinc', 'A2'])],
    title: (p) => `${p.thread} × ${p.L} carriage bolt, ${madeOf(p)[2]}`, of: (p) => madeOf(p)[0], make: 'cold-head', how: 'cold-headed with its dome and square neck, thread-rolled', spec: (p) => `${T(p).p} mm pitch; dome about ${(2.5 * dOf(p)).toFixed(0)} mm across; square neck ${dOf(p)} mm (DIN 603)`,
    box: (p) => [2.5 * dOf(p), 2.5 * dOf(p), Number(p.L) + 0.6 * dOf(p)], g: (p) => screwG(p, cyl(2.5 * dOf(p), 0.6 * dOf(p)) * 0.6),
  },
  {
    id: 'shoulderbolt', name: 'shoulder screw', path: 'Hardware/Fasteners/Shoulder screws', says: 'a ground shoulder under a socket head, a smaller thread past it: a pivot or a guide', std: 'ISO 7379, shoulders 6–20 mm',
    axes: [ax('d', 'shoulder diameter', 'mm', [6, 8, 10, 12, 16, 20]), ax('L', 'shoulder length', 'mm', (p) => pref(Number(p.d), Math.min(120, 10 * Number(p.d))))],
    title: (p) => `shoulder screw ${p.d} × ${p.L}`, of: () => 'steel-alloy', make: 'grind', how: 'turned from alloy steel, hardened, its shoulder ground to f9', spec: (p) => { const th: Record<number, string> = { 6: 'M5', 8: 'M6', 10: 'M8', 12: 'M10', 16: 'M12', 20: 'M16' }; return `shoulder ${p.d} mm f9 × ${p.L} mm; thread ${th[Number(p.d)]} (ISO 7379); class 12.9`; },
    box: (p) => [1.6 * Number(p.d), 1.6 * Number(p.d), Number(p.L) + 1.5 * Number(p.d)], g: (p) => gOf(cyl(Number(p.d), Number(p.L)) + cyl(1.6 * Number(p.d), 0.7 * Number(p.d)) + cyl(0.8 * Number(p.d), 0.9 * Number(p.d)), 7.85),
  },
  {
    id: 'eyebolt', name: 'lifting eye bolt', path: 'Hardware/Lifting/Eye bolts', says: 'a forged ring on a threaded shank, for lifting a load straight up', std: 'DIN 580, M8–M30, with the standard\'s working loads',
    axes: [bare('thread', 'thread', ['M8', 'M10', 'M12', 'M16', 'M20', 'M24', 'M30']), bare('matter', 'made of', ['steel', 'A2'])],
    title: (p) => `${p.thread} lifting eye bolt, ${madeOf(p)[2]}`, of: (p) => madeOf(p)[0], make: 'forge', alt: 'machine', how: 'drop-forged from C15 steel, normalised, thread cut', spec: (p) => { const W: Record<string, number> = { M8: 140, M10: 230, M12: 340, M16: 700, M20: 1200, M24: 1800, M30: 3600 }; return `working load ${W[String(p.thread)]} kg pulled straight up (DIN 580), far less at an angle`; },
    box: (p) => { const d = Number(String(p.thread).slice(1)); return [4.5 * d, 1.1 * d, 4.5 * d + 1.7 * d]; }, g: (p) => { const d = Number(String(p.thread).slice(1)); return gOf(Math.PI * 3.3 * d * Math.PI * (0.6 * d) ** 2 / 4 + cyl(d, 1.7 * d), 7.85); },
  },
  {
    id: 'flangenut', name: 'hex flange nut', path: 'Hardware/Fasteners/Nuts', says: 'a hex nut with a wide flange that spreads its load, serrated so it will not back off', std: 'DIN 6923, M5–M20',
    axes: [bare('thread', 'thread', threads('M5', 'M20')), bare('matter', 'made of', ['zinc', 'A2'])],
    title: (p) => `${p.thread} flange nut, ${madeOf(p)[2]}`, of: (p) => madeOf(p)[0], make: 'cold-head', how: 'cold-formed with its flange, pierced and tapped, serrated underneath', spec: (p) => `${T(p).s} mm across flats; flange about ${(2.2 * dOf(p)).toFixed(0)} mm (DIN 6923)`,
    box: (p) => [2.2 * dOf(p), 2.2 * dOf(p), dOf(p)], g: (p) => gOf(hexPrism(T(p).s, dOf(p)) + cyl(2.2 * dOf(p), 0.15 * dOf(p)) - cyl(dOf(p), dOf(p)), 7.85),
  },
  {
    id: 'wingnut', name: 'wing nut', path: 'Hardware/Fasteners/Nuts', says: 'a nut with two wings to turn by hand', std: 'DIN 315, M3–M12',
    axes: [bare('thread', 'thread', threads('M3', 'M12')), bare('matter', 'made of', ['zinc', 'A2', 'nylon'])],
    title: (p) => `${p.thread} wing nut, ${madeOf(p)[2]}`, of: (p) => madeOf(p)[0], make: (p) => (p.matter === 'nylon' ? 'mould' : 'cast'), how: (p) => (p.matter === 'nylon' ? 'moulded in nylon' : 'cast (or hot-forged), tapped'), spec: (p) => `wings about ${(5.5 * dOf(p) + 4).toFixed(0)} mm tip to tip (DIN 315, about)`,
    box: (p) => [5.5 * dOf(p) + 4, 1.5 * dOf(p) + 2, 2.6 * dOf(p) + 2], g: (p) => gOf(cyl(2 * dOf(p), 1.5 * dOf(p)) + 2 * (2 * dOf(p)) * (0.4 * dOf(p)) * (2.2 * dOf(p)), madeOf(p)[1]),
  },
  {
    id: 'capnut', name: 'acorn (cap) nut', path: 'Hardware/Fasteners/Nuts', says: 'a hex nut closed by a dome over the bolt\'s end', std: 'DIN 1587, M3–M20',
    axes: [bare('thread', 'thread', threads('M3', 'M20')), bare('matter', 'made of', ['zinc', 'A2'])],
    title: (p) => `${p.thread} acorn nut, ${madeOf(p)[2]}`, of: (p) => madeOf(p)[0], make: 'cold-head', how: 'cold-formed, its dome drawn closed, tapped blind', spec: (p) => `${T(p).s} mm across flats; about ${(1.6 * dOf(p) + 2).toFixed(1)} mm tall (DIN 1587, about)`,
    box: (p) => [T(p).s, T(p).s, 1.6 * dOf(p) + 2], g: (p) => gOf(hexPrism(T(p).s, T(p).m) + (2 / 3) * Math.PI * (T(p).s / 2) ** 3 * 0.5 - cyl(dOf(p), T(p).m), 7.85),
  },
  {
    id: 'squarenut', name: 'square nut, thin', path: 'Hardware/Fasteners/Nuts', says: 'a thin square nut that drops into a slot and cannot turn: the nut of printed parts', std: 'DIN 562, M3–M8',
    axes: [bare('thread', 'thread', threads('M3', 'M8')), bare('matter', 'made of', ['zinc', 'A2'])],
    title: (p) => `${p.thread} thin square nut, ${madeOf(p)[2]}`, of: (p) => madeOf(p)[0], make: 'stamp', how: 'stamped from strip, tapped', spec: (p) => { const S: Record<string, [number, number]> = { M3: [5.5, 1.8], M4: [7, 2.2], M5: [8, 2.7], M6: [10, 3.2], M8: [13, 4] }; const [s, m] = S[String(p.thread)]!; return `${s} mm square, ${m} mm thick (DIN 562)`; },
    box: (p) => [T(p).s, T(p).s, 0.5 * dOf(p) + 0.3], g: (p) => gOf(T(p).s ** 2 * (0.5 * dOf(p) + 0.3) - cyl(dOf(p), 0.5 * dOf(p)), 7.85),
  },
  {
    id: 'slotnut', name: 'T-slot nut for extrusion', path: 'Hardware/Structural/Extrusion fittings', says: 'a nut that slides or drops into an aluminium profile\'s slot to bolt things on anywhere along it', std: 'the slot widths of 20, 30/40 and 45 series profiles, with the threads makers fit (typical)',
    axes: [ax('slot', 'slot width', 'mm', [6, 8, 10]), bare('thread', 'thread', (p) => ({ 6: ['M3', 'M4', 'M5'], 8: ['M4', 'M5', 'M6', 'M8'], 10: ['M5', 'M6', 'M8'] } as Record<number, string[]>)[Number(p.slot)]!), bare('style', 'style', ['hammer', 'rollin', 'sliding'])],
    title: (p) => `${p.thread} T-slot nut, slot ${p.slot}, ${p.style === 'rollin' ? 'roll-in' : p.style}`, of: () => 'steel-low zinc', make: 'machine', how: (p) => (p.style === 'hammer' ? 'cut from drawn steel bar shaped to turn into the slot a quarter turn' : p.style === 'rollin' ? 'machined with a spring ball that holds it where it is put' : 'cut from bar to slide in from the profile\'s end'), spec: (p) => `for slot ${p.slot} (${p.slot === 6 ? '20' : p.slot === 8 ? '30 and 40' : '45'} series); ${p.thread}`,
    box: (p) => [Number(p.slot) * 1.8, Number(p.slot) * 1.1, Number(p.slot) * 0.7], g: (p) => gOf(Number(p.slot) ** 3 * 1.8 * 1.1 * 0.7 * 0.7, 7.85),
  },
  {
    id: 'blindrivet', name: 'blind rivet', path: 'Hardware/Fasteners/Rivets', says: 'a hollow rivet set from one side: its mandrel pulled until it snaps, swelling the far end', std: 'ISO 15977/15983 diameters, in the lengths makers sell (typical)',
    axes: [ax('d', 'diameter', 'mm', [2.4, 3.2, 4, 4.8, 6.4]), ax('L', 'length', 'mm', (p) => ({ 2.4: [4, 6, 8, 10], 3.2: [6, 8, 10, 12, 16], 4: [6, 8, 10, 12, 14, 16, 20], 4.8: [8, 10, 12, 14, 16, 20, 25], 6.4: [10, 12, 16, 20, 25, 30] } as Record<number, number[]>)[Number(p.d)]!), bare('matter', 'made of', ['aluminium', 'steel', 'stainless'])],
    title: (p) => `blind rivet ${p.d} × ${p.L}, ${madeOf(p)[2]}`, of: (p) => `${madeOf(p)[0]} ${p.matter === 'aluminium' ? 'steel-low' : madeOf(p)[0]}`, make: 'cold-head', how: 'its body cold-headed and drawn hollow, a mandrel put through it with a neck to snap',
    spec: (p) => `drill ${(Number(p.d) + 0.1).toFixed(1)} mm; grips about ${Math.max(0.5, Number(p.L) - 1.6 * Number(p.d)).toFixed(1)}–${(Number(p.L) - 1.1 * Number(p.d)).toFixed(1)} mm of plate (typical)`, box: (p) => [2 * Number(p.d), 2 * Number(p.d), Number(p.L) + 25], g: (p) => gOf(ring(Number(p.d), 0.55 * Number(p.d), Number(p.L)), madeOf(p)[1]) + gOf(cyl(0.5 * Number(p.d), Number(p.L) + 25), 7.85),
  },
  {
    id: 'splitpin', name: 'split pin (cotter pin)', path: 'Hardware/Fasteners/Pins', says: 'a doubled half-round wire put through a hole and bent open, so a nut or pin cannot come off', std: 'ISO 1234, 1–8 mm',
    axes: [ax('d', 'size (hole)', 'mm', [1, 1.2, 1.6, 2, 2.5, 3.2, 4, 5, 6.3, 8]), ax('L', 'length', 'mm', (p) => pref(Math.max(4, 4 * Number(p.d)), Math.min(160, 20 * Number(p.d)))), bare('matter', 'made of', ['zinc', 'A2'])],
    title: (p) => `split pin ${p.d} × ${p.L}, ${madeOf(p)[2]}`, of: (p) => madeOf(p)[0], make: 'draw', how: 'half-round wire drawn, folded double with an eye, cut to length', spec: (p) => `for a ${p.d} mm hole (ISO 1234)`,
    box: (p) => [Number(p.d) * 2, Number(p.d), Number(p.L) + Number(p.d) * 2], g: (p) => gOf(cyl(Number(p.d) * 0.9, Number(p.L)) , madeOf(p)[1]),
  },
  {
    id: 'springpin', name: 'spring pin (roll pin)', path: 'Hardware/Fasteners/Pins', says: 'a slotted tube of spring steel driven into a hole a little smaller, held by its own spring', std: 'ISO 8752 heavy duty, 1–12 mm, with its minimum double-shear loads',
    axes: [ax('d', 'diameter', 'mm', [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12]), ax('L', 'length', 'mm', (p) => pref(Math.max(4, Number(p.d)), Math.min(120, 10 * Number(p.d)))), bare('matter', 'made of', ['steel', 'stainless'])],
    title: (p) => `spring pin ${p.d} × ${p.L}${p.matter === 'stainless' ? ', stainless' : ''}`, of: (p) => (p.matter === 'stainless' ? 'stainless-304' : 'steel-spring'), make: 'roll', how: 'spring-steel strip rolled into a slotted tube, chamfered, hardened and tempered',
    spec: (p) => { const S: Record<number, number> = { 1: 0.7, 1.5: 1.58, 2: 2.82, 2.5: 4.38, 3: 6.32, 4: 11.24, 5: 17.54, 6: 26.04, 8: 42.76, 10: 70.16, 12: 104.1 }; return `for a ${p.d} mm H12 hole; takes at least ${S[Number(p.d)]} kN in double shear (ISO 8752, steel)`; },
    box: (p) => [Number(p.d), Number(p.d), Number(p.L)], g: (p) => gOf(ring(Number(p.d), Number(p.d) * 0.8, Number(p.L)), 7.85),
  },
  {
    id: 'clevispin', name: 'clevis pin', path: 'Hardware/Fasteners/Pins', says: 'a headed pin with a cross hole for a split pin: the hinge of a clevis', std: 'ISO 2341 B, 3–20 mm',
    axes: [ax('d', 'diameter', 'mm', [3, 4, 5, 6, 8, 10, 12, 14, 16, 20]), ax('L', 'length', 'mm', (p) => pref(2 * Number(p.d), Math.min(200, 10 * Number(p.d)))), bare('matter', 'made of', ['steel', 'stainless'])],
    title: (p) => `clevis pin ${p.d} × ${p.L}${p.matter === 'stainless' ? ', stainless' : ''}`, of: (p) => madeOf(p)[0], make: 'machine', alt: 'machine', how: 'cold-headed from bar, its split-pin hole cross-drilled', spec: (p) => `${p.d} mm h11, head about ${(1.6 * Number(p.d) + 1).toFixed(0)} mm (ISO 2341, about)`,
    box: (p) => [1.6 * Number(p.d) + 1, 1.6 * Number(p.d) + 1, Number(p.L) + 0.4 * Number(p.d)], g: (p) => gOf(cyl(Number(p.d), Number(p.L)) + cyl(1.6 * Number(p.d) + 1, 0.4 * Number(p.d)), madeOf(p)[1]),
  },
  {
    id: 'springwasher', name: 'split lock washer', path: 'Hardware/Fasteners/Washers', says: 'a split, twisted ring of spring steel under a nut or head', std: 'DIN 127 B, M3–M24',
    axes: [bare('thread', 'for thread', threads('M3', 'M24')), bare('matter', 'made of', ['zinc', 'A2'])],
    title: (p) => `${p.thread} spring washer, ${madeOf(p)[2]}`, of: (p) => (p.matter === 'A2' ? 'stainless-304' : 'steel-spring zinc'), make: 'coil', how: 'square spring wire coiled, cut, set and hardened',
    spec: (p) => { const W: Record<string, [number, number, number]> = { M3: [3.1, 6.2, 0.8], M4: [4.1, 7.6, 0.9], M5: [5.1, 9.2, 1.2], M6: [6.1, 11.8, 1.6], M8: [8.2, 14.8, 2], M10: [10.2, 18.1, 2.2], M12: [12.2, 21.1, 2.5], M14: [14.2, 24.1, 3], M16: [16.2, 27.4, 3.5], M20: [20.2, 33.6, 4], M24: [24.5, 40, 5] }; const [a, b, s] = W[String(p.thread)]!; return `${a} × ${b} mm, ${s} mm thick (DIN 127 B)`; },
    box: (p) => [1.8 * dOf(p) + 1, 1.8 * dOf(p) + 1, 0.5 * dOf(p)], g: (p) => gOf(ring(1.8 * dOf(p) + 1, dOf(p) + 0.1, 0.22 * dOf(p) + 0.1), 7.85),
  },
  {
    id: 'fenderwasher', name: 'large flat washer', path: 'Hardware/Fasteners/Washers', says: 'a flat washer three times its bolt across, to spread a load on soft or thin stuff', std: 'ISO 7093, M3–M20',
    axes: [bare('thread', 'for thread', threads('M3', 'M20')), bare('matter', 'made of', ['zinc', 'A2', 'nylon'])],
    title: (p) => `${p.thread} large washer, ${madeOf(p)[2]}`, of: (p) => madeOf(p)[0], make: (p) => (p.matter === 'nylon' ? 'mould' : 'stamp'), how: 'stamped from sheet',
    spec: (p) => { const W: Record<string, [number, number, number]> = { M3: [3.2, 9, 0.8], M4: [4.3, 12, 1], M5: [5.3, 15, 1.2], M6: [6.4, 18, 1.6], M8: [8.4, 24, 2], M10: [10.5, 30, 2.5], M12: [13, 37, 3], M14: [15, 44, 3], M16: [17, 50, 3], M20: [22, 60, 4] }; const [a, b, h] = W[String(p.thread)]!; return `${a} × ${b} × ${h} mm (ISO 7093)`; },
    box: (p) => [3 * dOf(p), 3 * dOf(p), 0.2 * dOf(p)], g: (p) => gOf(ring(3 * dOf(p), dOf(p) + 0.3, 0.2 * dOf(p)), madeOf(p)[1]),
  },
  {
    id: 'circlipint', name: 'retaining ring (circlip), internal', path: 'Hardware/Fasteners/Retaining rings', says: 'a spring-steel ring that snaps into a groove inside a bore, to hold a bearing in', std: 'DIN 472, bores 8–100 mm',
    axes: [ax('d', 'bore', 'mm', [8, 10, 12, 14, 15, 16, 18, 19, 20, 22, 24, 25, 26, 28, 30, 32, 35, 37, 40, 42, 47, 52, 62, 72, 80, 90, 100])],
    title: (p) => `internal circlip for a ${p.d} mm bore`, of: () => 'steel-spring', make: 'stamp', how: 'stamped from spring-steel strip with its two eyes, hardened, phosphated', spec: (p) => { const d = Number(p.d), s = d < 10 ? 0.8 : d <= 22 ? 1 : d <= 32 ? 1.2 : d <= 37 ? 1.5 : d <= 48 ? 1.75 : d <= 68 ? 2 : d <= 85 ? 2.5 : 3; return `${s} mm thick; groove about ${(d * 1.04 + 0.2).toFixed(1)} mm (DIN 472)`; },
    box: (p) => [Number(p.d) * 1.1, Number(p.d) * 1.1, 1.5], g: (p) => gOf(ring(Number(p.d) * 1.08, Number(p.d) * 0.88, Number(p.d) < 22 ? 1 : 1.5) * 0.9, 7.85),
  },
  {
    id: 'eclip', name: 'E-clip', path: 'Hardware/Fasteners/Retaining rings', says: 'an E-shaped spring ring pushed sideways onto a groove in a shaft', std: 'DIN 6799, grooves 1.2–24 mm',
    axes: [ax('d', 'groove diameter', 'mm', [1.2, 1.5, 1.9, 2.3, 3.2, 4, 5, 6, 7, 8, 9, 10, 12, 15, 19, 24]), bare('matter', 'made of', ['steel', 'stainless'])],
    title: (p) => `E-clip ${p.d}${p.matter === 'stainless' ? ', stainless' : ''}`, of: (p) => (p.matter === 'stainless' ? 'stainless-304' : 'steel-spring'), make: 'stamp', how: 'stamped from spring strip, hardened',
    spec: (p) => { const R: Record<number, [number, number, number]> = { 1.2: [1.4, 2, 0.3], 1.5: [2, 2.5, 0.4], 1.9: [2.5, 3, 0.5], 2.3: [3, 4, 0.6], 3.2: [4, 5, 0.6], 4: [5, 7, 0.7], 5: [6, 8, 0.7], 6: [7, 9, 0.7], 7: [8, 11, 0.9], 8: [9, 12, 1], 9: [10, 14, 1.1], 10: [11, 15, 1.2], 12: [13, 18, 1.3], 15: [16, 24, 1.5], 19: [20, 31, 1.75], 24: [25, 38, 2] }; const [a, b, s] = R[Number(p.d)]!; return `for shafts ${a}–${b} mm; ${s} mm thick (DIN 6799)`; },
    box: (p) => [Number(p.d) * 2, Number(p.d) * 2, 1], g: (p) => gOf(ring(Number(p.d) * 2, Number(p.d), Number(p.d) / 12 + 0.2) * 0.6, 7.85),
  },
  {
    id: 'wallplug', name: 'wall plug (anchor)', path: 'Hardware/Fasteners/Anchors', says: 'a nylon sleeve pushed into a drilled hole; a screw spreads it to grip the wall', std: 'the diameters and lengths makers sell for masonry (typical)',
    axes: [ax('d', 'diameter (= the drill)', 'mm', [5, 6, 8, 10, 12, 14]), ax('L', 'length', 'mm', (p) => ({ 5: [25], 6: [30, 50], 8: [40, 65], 10: [50, 80], 12: [60, 100], 14: [70] } as Record<number, number[]>)[Number(p.d)]!)],
    title: (p) => `wall plug ${p.d} × ${p.L}`, of: () => 'nylon', make: 'mould', how: 'injection-moulded in nylon 6, with barbs and splitting legs', spec: (p) => { const S: Record<number, string> = { 5: '3–4', 6: '4–5', 8: '4.5–6', 10: '6–8', 12: '8–10', 14: '10–12' }; return `drill ${p.d} mm, ${Number(p.L) + 10} mm deep; for ${S[Number(p.d)]} mm screws (typical)`; },
    box: (p) => [Number(p.d), Number(p.d), Number(p.L)], g: (p) => gOf(ring(Number(p.d), Number(p.d) * 0.55, Number(p.L)), 1.14),
  },
  {
    id: 'helicoil', name: 'wire thread insert', path: 'Hardware/Fasteners/Inserts', says: 'a coil of diamond-section wire that lines a tapped hole with a hard, true thread', std: 'DIN 8140, M2–M12, 1 to 3 diameters long',
    axes: [bare('thread', 'thread', threads('M2', 'M12')), ax('x', 'length, in diameters', 'd', [1, 1.5, 2, 2.5, 3])],
    title: (p) => `${p.thread} wire thread insert, ${p.x}d`, of: () => 'stainless-304', make: 'coil', how: 'stainless wire rolled to a diamond section and coiled, its tang notched to snap off',
    spec: (p) => { const D: Record<string, number> = { M2: 2.1, 'M2.5': 2.6, M3: 3.2, M4: 4.2, M5: 5.2, M6: 6.3, M8: 8.4, M10: 10.5, M12: 12.5 }; return `drill ${D[String(p.thread)] ?? dOf(p) + 0.2} mm, tap ${p.thread} STI; ${(Number(p.x) * dOf(p)).toFixed(1)} mm long`; },
    box: (p) => [dOf(p) * 1.3, dOf(p) * 1.3, Number(p.x) * dOf(p)], g: (p) => gOf(ring(dOf(p) * 1.25, dOf(p), Number(p.x) * dOf(p)) * 0.8, 8),
  },
  {
    id: 'rivnut', name: 'blind rivet nut', path: 'Hardware/Fasteners/Inserts', says: 'a threaded sleeve set into a hole in thin sheet from one side, to bolt into', std: 'flat-head rivet nuts M3–M10, the sizes makers sell (typical)',
    axes: [bare('thread', 'thread', ['M3', 'M4', 'M5', 'M6', 'M8', 'M10']), bare('matter', 'made of', ['steel', 'aluminium', 'stainless'])],
    title: (p) => `${p.thread} rivet nut, ${madeOf(p)[2]}`, of: (p) => madeOf(p)[0], make: 'cold-head', how: 'cold-formed sleeve, tapped, its thin wall to fold and grip',
    spec: (p) => { const H: Record<string, number> = { M3: 5, M4: 6, M5: 7, M6: 9, M8: 11, M10: 13 }; return `hole ${H[String(p.thread)]} mm (typical)`; }, box: (p) => [2 * dOf(p) + 2, 2 * dOf(p) + 2, 2.2 * dOf(p) + 4], g: (p) => gOf(ring(1.6 * dOf(p) + 1, dOf(p), 2.2 * dOf(p) + 4), madeOf(p)[1]),
  },
  {
    id: 'cabletie', name: 'cable tie', path: 'Hardware/Wire management/Cable ties', says: 'a nylon strap that ratchets shut through its own head', std: 'the lengths and widths sold, with the loop tensile strengths of their widths (the usual 18/40/50/120/175 lb classes)',
    axes: [bare('size', 'length × width', ['100x2.5', '140x3.6', '200x3.6', '200x4.8', '250x4.8', '300x4.8', '370x4.8', '300x7.6', '450x7.6', '550x9']), bare('colour', 'colour', ['natural', 'black'])],
    title: (p) => `cable tie ${String(p.size).replace('x', ' × ')} mm, ${p.colour}`, of: () => 'nylon', make: 'mould', how: (p) => `moulded in nylon 6,6${p.colour === 'black' ? ' with carbon black against sunlight' : ''}`,
    spec: (p) => { const [L, w] = String(p.size).split('x').map(Number) as [number, number], kg: Record<number, number> = { 2.5: 8, 3.6: 18, 4.8: 22, 7.6: 54, 9: 79 }; return `holds about ${kg[w]} kg in its loop; bundles up to about ${((L - 30) / Math.PI).toFixed(0)} mm across`; },
    box: (p) => { const [L, w] = String(p.size).split('x').map(Number) as [number, number]; return [w * 2.2, w * 1.6, L]; }, g: (p) => { const [L, w] = String(p.size).split('x').map(Number) as [number, number]; return gOf(L * w * w * 0.32, 1.14); },
  },
  {
    id: 'nail', name: 'round wire nail', path: 'Hardware/Fasteners/Nails', says: 'a plain-shank wire nail with a flat head', std: 'the shank × length pairs merchants sell (typical)',
    axes: [bare('size', 'shank × length', ['1.4x25', '1.6x30', '2x40', '2.5x50', '2.8x65', '3.1x75', '3.4x90', '4x100', '5x125', '6x150']), bare('matter', 'made of', ['steel', 'zinc', 'stainless'])],
    title: (p) => `nail ${String(p.size).replace('x', ' × ')} mm, ${madeOf(p)[2]}`, of: (p) => madeOf(p)[0], make: 'cold-head', how: 'wire cut, its head upset and point pinched in one stroke', spec: (p) => `${p.size} mm; head about ${(2.2 * Number(String(p.size).split('x')[0])).toFixed(1)} mm`,
    box: (p) => { const [d, L] = String(p.size).split('x').map(Number) as [number, number]; return [2.2 * d, 2.2 * d, L]; }, g: (p) => { const [d, L] = String(p.size).split('x').map(Number) as [number, number]; return gOf(cyl(d, L), 7.85); },
  },
  {
    id: 'hookloop', name: 'hook-and-loop tape', path: 'Hardware/Fasteners/Hook and loop', says: 'two tapes, one of tiny hooks and one of loops, that grip when pressed together', std: 'the widths sold, any length cut to the centimetre',
    axes: [unit('w', 'width', 'mm', [16, 20, 25, 38, 50, 100]), bare('side', 'side', ['hook', 'loop', 'pair']), bare('back', 'backing', ['sewon', 'adhesive']), unit('L', 'length', 'm', [1, 5, 25], [0.01, 25, 0.01])],
    title: (p) => `hook-and-loop tape ${p.w} mm, ${p.side}, ${p.back === 'sewon' ? 'sew-on' : 'self-adhesive'}, ${p.L} m`, of: (p) => (p.back === 'adhesive' ? 'nylon pp epoxy' : 'nylon pp'), make: 'laminate', how: 'nylon woven with monofilament loops, cut into hooks on one tape and brushed into loops on the other',
    spec: (p) => `${p.w} mm × ${p.L} m; peel about 1 N/cm (typical)`, box: (p) => [Number(p.w), 3, Math.min(Number(p.L) * 1000, 400)], g: (p) => Number(p.w) * Number(p.L) * 0.45 * (p.side === 'pair' ? 2 : 1),
  },
];
