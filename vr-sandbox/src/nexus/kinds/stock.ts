// Stock and supplies: structural sections (angle, channel, flat, square and hex bar, box section, DIN rail), timber,
// printer filament, rope, tape and adhesives; enclosures and cable management; the hardware of furniture (hinges,
// handles, knobs, drawer slides, castors); and heat (heat sinks, thermal pads, thermostats, heat pipes, Peltiers).
// Sections from EN 10056-1, EN 10279, EN 10058/10059/10061 and EN 10219; timber from PS 20; the rest makers' sizes.

import { ax, bare, cyl, gOf, matOf, range, ring, tagged, unit, type KindDef, type P } from './core';

const n = (p: P, k: string) => Number(p[k]);
const s = (p: P, k: string) => String(p[k]);
const madeOf = (p: P) => matOf(p.matter);
const LEN: [number, number, number] = [10, 6000, 1];
/** EN 10279 UPN channels: height, flange, web, flange thickness (mm), kg a metre. */
const UPN: Record<number, [number, number, number, number, number]> = { 50: [50, 38, 5, 7, 5.59], 65: [65, 42, 5.5, 7.5, 7.09], 80: [80, 45, 6, 8, 8.64], 100: [100, 50, 6, 8.5, 10.6], 120: [120, 55, 7, 9, 13.4], 140: [140, 60, 7, 10, 16], 160: [160, 65, 7.5, 10.5, 18.8], 180: [180, 70, 8, 11, 22], 200: [200, 75, 8.5, 11.5, 25.3] };
const ANGLES = ['20x3', '25x3', '25x4', '30x3', '30x4', '40x4', '40x5', '50x5', '50x6', '60x6', '70x7', '80x8', '100x10'];
const RHS = ['20x10', '30x15', '30x20', '40x20', '40x30', '50x25', '50x30', '60x30', '60x40', '80x40', '100x50', '120x60', '150x100', '200x100'];
/** PS 20 dressed sizes of nominal timber, inches. */
const DRESSED: Record<number, number> = { 1: 0.75, 2: 1.5, 3: 2.5, 4: 3.5, 6: 5.5, 8: 7.25, 10: 9.25, 12: 11.25 };
const FIL: Record<string, [string, number, number]> = { pla: ['pla', 1.24, 210], petg: ['pet', 1.27, 235], abs: ['abs', 1.04, 245], asa: ['asa', 1.07, 250], tpu: ['pu', 1.21, 225], nylon: ['nylon', 1.14, 260], pc: ['pc', 1.2, 280] };
const TAPES: Record<string, [string, string, number[], number[], number]> = {
  electrical: ['PVC electrical tape', 'pvc rubber', [15, 19, 25], [10, 20, 33], 0.15], kapton: ['polyimide (Kapton-type) tape', 'polyimide silicone', [6, 10, 12, 20, 25, 50], [33], 0.06], ptfe: ['PTFE thread-seal tape', 'ptfe', [12, 19], [10, 12], 0.075],
  masking: ['masking tape', 'paper rubber', [18, 24, 36, 48], [50], 0.13], duct: ['duct tape', 'pe pet rubber', [48], [25, 50], 0.25], aluminium: ['aluminium foil tape', 'al-foil pmma', [25, 50, 75], [50], 0.08],
  foam: ['double-sided foam tape', 'pe pmma', [6, 12, 19, 25], [5], 1], copper: ['copper foil tape', 'copper-foil pmma', [6, 10, 25], [33], 0.07], vhb: ['acrylic foam (VHB-type) tape', 'pmma', [12, 19, 25], [3], 1.1],
};
const GLUES: Record<string, [string, string, string[], string]> = {
  cyanoacrylate: ['cyanoacrylate (super glue)', 'cyanoacrylate', ['3g', '20g', '50g'], 'cures in seconds from the moisture on the surfaces; for small, close-fitting joints'],
  epoxy5: ['epoxy, 5-minute', 'epoxy', ['25ml', '50ml', '250ml'], 'two parts mixed: sets in 5 minutes, strong in an hour, fills gaps'], epoxy24: ['epoxy, slow (24-hour)', 'epoxy', ['50ml', '250ml', '1l'], 'two parts mixed: slow and the strongest; for structural joints'],
  pva: ['PVA wood glue', 'glue water', ['100ml', '250ml', '1l'], 'dries by losing water: wood to wood, clamped'], hotmelt: ['hot-melt glue sticks', 'eva', ['7mm', '11mm'], 'melted in a gun, sets as it cools'],
  rtv: ['RTV silicone', 'silicone', ['85ml', '310ml'], 'cures from the air\'s moisture into a rubber: seals and potting'], pu: ['polyurethane glue', 'pu', ['100ml', '250ml'], 'cures by moisture and foams a little: wood, stone, foam'], contact: ['contact adhesive', 'neoprene', ['50ml', '250ml', '1l'], 'both faces coated and left tacky, then pressed: laminates, leather, rubber'],
};
/** Plastic enclosures sold (L × W × H, mm), IP65 (typical). */
const BOXES = ['65x58x35', '83x58x33', '100x68x50', '115x90x55', '120x80x50', '158x90x60', '160x110x70', '200x120x75', '240x160x90', '280x190x130'];
/** EN 62444 cable glands: clamping range (mm, typical). */
const GLAND: Record<string, string> = { M12: '3–6.5', M16: '4–8', M20: '6–12', M25: '13–18', M32: '18–25', M40: '22–32', M50: '32–38', M63: '37–44' };
/** Peltier modules TEC1-127xx: their maximum current, ΔT, power pumped (W, typical). */
const TEC: Record<string, [number, number]> = { '12703': [3, 27], '12704': [4, 37], '12705': [5, 46], '12706': [6, 53], '12708': [8, 72], '12710': [10, 89], '12715': [15, 136] };

export const STOCK: KindDef[] = [
  {
    id: 'angle', name: 'equal angle', path: 'Hardware/Structural/Angles', says: 'an L-section bar, both legs the same', std: 'EN 10056-1 sizes, cut to any length 10–6000 mm',
    axes: [bare('size', 'leg × thickness', ANGLES), bare('matter', 'made of', ['steel', 'aluminium', 'stainless']), unit('L', 'length', 'mm', [500, 1000, 2000, 3000, 6000], LEN)],
    title: (p) => `angle ${String(p.size).replace('x', ' × ')}, ${madeOf(p)[2]}, ${p.L} mm`, of: (p) => madeOf(p)[0], make: (p) => (p.matter === 'aluminium' ? 'extrude' : 'roll'), how: (p) => (p.matter === 'aluminium' ? 'extruded and aged' : 'hot-rolled from billet'),
    spec: (p) => { const [a, t] = String(p.size).split('x').map(Number) as [number, number], A = t * (2 * a - t); return `section ${A} mm² (legs only, roots left out): ${((A / 1e6) * madeOf(p)[1] * 1000).toFixed(2)} kg a metre`; }, box: (p) => { const a = Number(String(p.size).split('x')[0]); return [a, a, n(p, 'L')]; }, g: (p) => { const [a, t] = String(p.size).split('x').map(Number) as [number, number]; return gOf(t * (2 * a - t) * n(p, 'L'), madeOf(p)[1]); },
  },
  {
    id: 'channel', name: 'UPN channel', path: 'Hardware/Structural/Beams', says: 'a steel C-section with tapered flanges', std: 'EN 10279 UPN 50–200, cut to any length 0.1–12 m to the centimetre',
    axes: [tagged('size', 'UPN', 'height', 'mm', Object.keys(UPN).map(Number)), unit('L', 'length', 'm', [1, 3, 6, 12], [0.1, 12, 0.01])],
    title: (p) => `UPN ${p.size} channel, ${p.L} m`, of: () => 'steel-low', make: 'roll', how: 'hot-rolled S235 or S275 steel', spec: (p) => { const [h, b, tw, tf, kg] = UPN[n(p, 'size')]!; return `${h} × ${b} mm, web ${tw}, flanges ${tf} mm; ${kg} kg a metre (EN 10279)`; },
    box: (p) => { const [h, b] = UPN[n(p, 'size')]!; return [b, h, n(p, 'L') * 1000]; }, g: (p) => UPN[n(p, 'size')]![4] * n(p, 'L') * 1000,
  },
  {
    id: 'flatbar', name: 'flat bar', path: 'Hardware/Structural/Bar', says: 'a rectangular bar', std: 'EN 10058 widths and thicknesses, cut to any length 10–6000 mm',
    axes: [ax('w', 'width', 'mm', [10, 12, 15, 16, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120, 150, 200]), ax('t', 'thickness', 'mm', (p) => [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30].filter((t) => t < n(p, 'w'))), bare('matter', 'made of', ['steel', 'aluminium', 'stainless', 'brass', 'copper']), unit('L', 'length', 'mm', [500, 1000, 2000, 3000], LEN)],
    title: (p) => `flat bar ${p.w} × ${p.t}, ${madeOf(p)[2]}, ${p.L} mm`, of: (p) => madeOf(p)[0], make: (p) => (p.matter === 'aluminium' ? 'extrude' : 'roll'), how: (p) => (p.matter === 'aluminium' ? 'extruded' : p.matter === 'brass' || p.matter === 'copper' ? 'drawn' : 'hot-rolled'), spec: (p) => `${p.w} × ${p.t} mm: ${((n(p, 'w') * n(p, 't') * madeOf(p)[1]) / 1000).toFixed(3)} kg a metre`,
    box: (p) => [n(p, 'w'), n(p, 't'), n(p, 'L')], g: (p) => gOf(n(p, 'w') * n(p, 't') * n(p, 'L'), madeOf(p)[1]),
  },
  {
    id: 'squarebar', name: 'square bar', path: 'Hardware/Structural/Bar', says: 'a solid square bar', std: 'EN 10059 sizes, cut to any length 10–6000 mm',
    axes: [ax('a', 'side', 'mm', [5, 6, 8, 10, 12, 15, 16, 20, 25, 30, 35, 40, 50, 60, 80, 100]), bare('matter', 'made of', ['steel', 'aluminium', 'stainless', 'brass']), unit('L', 'length', 'mm', [500, 1000, 2000, 3000], LEN)],
    title: (p) => `square bar ${p.a} mm, ${madeOf(p)[2]}, ${p.L} mm`, of: (p) => madeOf(p)[0], make: (p) => (p.matter === 'aluminium' ? 'extrude' : 'draw'), how: 'drawn bright (or extruded, in aluminium)', spec: (p) => `${p.a} mm square: ${((n(p, 'a') ** 2 * madeOf(p)[1]) / 1000).toFixed(3)} kg a metre`,
    box: (p) => [n(p, 'a'), n(p, 'a'), n(p, 'L')], g: (p) => gOf(n(p, 'a') ** 2 * n(p, 'L'), madeOf(p)[1]),
  },
  {
    id: 'hexbar', name: 'hexagon bar', path: 'Hardware/Structural/Bar', says: 'a hexagonal bar, the stock nuts, spacers and fittings are turned from', std: 'EN 10061 sizes across flats, cut to any length 10–6000 mm',
    axes: [ax('af', 'across flats', 'mm', [5, 6, 7, 8, 10, 12, 13, 14, 17, 19, 22, 24, 27, 30, 32, 36, 41, 46, 50]), bare('matter', 'made of', ['steel', 'stainless', 'brass', 'aluminium']), unit('L', 'length', 'mm', [500, 1000, 2000, 3000], LEN)],
    title: (p) => `hex bar ${p.af} mm A/F, ${madeOf(p)[2]}, ${p.L} mm`, of: (p) => madeOf(p)[0], make: 'draw', how: 'cold-drawn through a hex die', spec: (p) => `${p.af} mm across flats, ${(n(p, 'af') / Math.cos(Math.PI / 6)).toFixed(1)} mm across corners`,
    box: (p) => [n(p, 'af') / Math.cos(Math.PI / 6), n(p, 'af'), n(p, 'L')], g: (p) => gOf((Math.sqrt(3) / 2) * n(p, 'af') ** 2 * n(p, 'L'), madeOf(p)[1]),
  },
  {
    id: 'boxsection', name: 'rectangular hollow section', path: 'Hardware/Structural/Tube', says: 'a rectangular steel or aluminium tube', std: 'EN 10219 sizes and walls, cut to any length 10–6000 mm',
    axes: [bare('size', 'outside', RHS), ax('t', 'wall', 'mm', (p) => { const b = Number(String(p.size).split('x')[1]); return [1.5, 2, 2.5, 3, 4, 5, 6].filter((t) => t <= b / 4); }), bare('matter', 'made of', ['steel', 'aluminium', 'stainless']), unit('L', 'length', 'mm', [1000, 3000, 6000], LEN)],
    title: (p) => `box section ${String(p.size).replace('x', ' × ')} × ${p.t}, ${madeOf(p)[2]}, ${p.L} mm`, of: (p) => madeOf(p)[0], make: (p) => (p.matter === 'aluminium' ? 'extrude' : 'weld'), how: (p) => (p.matter === 'aluminium' ? 'extruded' : 'strip roll-formed and seam-welded, sized square'),
    spec: (p) => { const [h, b] = String(p.size).split('x').map(Number) as [number, number], t = n(p, 't'), A = h * b - (h - 2 * t) * (b - 2 * t); return `${A.toFixed(0)} mm² of section (corners square): ${((A * madeOf(p)[1]) / 1000).toFixed(2)} kg a metre`; },
    box: (p) => { const [h, b] = String(p.size).split('x').map(Number) as [number, number]; return [h, b, n(p, 'L')]; }, g: (p) => { const [h, b] = String(p.size).split('x').map(Number) as [number, number], t = n(p, 't'); return gOf((h * b - (h - 2 * t) * (b - 2 * t)) * n(p, 'L'), madeOf(p)[1]); },
  },
  {
    id: 'dinrail', name: 'DIN rail', path: 'Electrical/Enclosures/DIN rail', says: 'the top-hat rail breakers, terminals and power supplies clip onto', std: 'EN 60715 profiles, cut to any length 10–2000 mm',
    axes: [bare('profile', 'profile', ['TS35x7.5', 'TS35x15', 'TS15']), bare('matter', 'made of', ['steel', 'aluminium']), unit('L', 'length', 'mm', [250, 500, 1000, 2000], [10, 2000, 1])],
    title: (p) => `DIN rail ${p.profile}, ${madeOf(p)[2]}, ${p.L} mm`, of: (p) => (p.matter === 'steel' ? 'steel-low zinc' : 'al-6063'), make: (p) => (p.matter === 'steel' ? 'roll' : 'extrude'), how: 'roll-formed from zinc-plated strip and slotted (or extruded)', spec: (p) => `${String(p.profile).replace('TS', '').replace('x', ' × ')} mm (EN 60715)`,
    box: (p) => (p.profile === 'TS15' ? [15, 5.5, n(p, 'L')] : [35, p.profile === 'TS35x15' ? 15 : 7.5, n(p, 'L')]), g: (p) => (p.profile === 'TS15' ? 0.12 : p.profile === 'TS35x15' ? 0.5 : 0.28) * n(p, 'L') * (p.matter === 'aluminium' ? 0.35 : 1),
  },
  {
    id: 'lumber', name: 'dimensional lumber', path: 'Hardware/Structural/Timber', says: 'softwood sawn and planed to its dressed size', std: 'the nominal sizes of PS 20 and their dressed sizes; the lengths sold, or cut to any length to the millimetre',
    axes: [bare('size', 'nominal', ['1x2', '1x3', '1x4', '1x6', '1x8', '1x10', '1x12', '2x2', '2x3', '2x4', '2x6', '2x8', '2x10', '2x12', '4x4', '6x6']), unit('L', 'length', 'mm', [1829, 2438, 3048, 3658, 4267, 4877], [100, 4877, 1])],
    title: (p) => { const [a, b] = String(p.size).split('x').map(Number) as [number, number]; return `${p.size} lumber (${(DRESSED[a] ?? a - 0.5) * 25.4} × ${(DRESSED[b] ?? b - 0.5) * 25.4} mm), ${p.L} mm`; }, of: () => 'wood', make: 'machine', how: 'spruce, pine or fir sawn, kiln-dried and planed four sides',
    spec: (p) => { const [a, b] = String(p.size).split('x').map(Number) as [number, number]; return `nominal ${a} × ${b} in, dressed ${a === 4 || a === 6 ? (a === 4 ? 3.5 : 5.5) : DRESSED[a]} × ${DRESSED[b]} in (PS 20); about 0.45 g/cm³ (typical of SPF)`; },
    box: (p) => { const [a, b] = String(p.size).split('x').map(Number) as [number, number]; return [(a === 4 ? 3.5 : a === 6 ? 5.5 : DRESSED[a]!) * 25.4, DRESSED[b]! * 25.4, n(p, 'L')]; }, g: (p) => { const [a, b] = String(p.size).split('x').map(Number) as [number, number]; return gOf((a === 4 ? 3.5 : a === 6 ? 5.5 : DRESSED[a]!) * 25.4 * DRESSED[b]! * 25.4 * n(p, 'L'), 0.45); },
  },
  {
    id: 'filament', name: '3D printer filament', path: 'Materials/Filament/Spools', says: 'a spool of plastic filament for a fused-deposition printer', std: 'the plastics, diameters, spool weights and colours sold',
    axes: [bare('matter', 'plastic', Object.keys(FIL)), ax('d', 'diameter', 'mm', [1.75, 2.85]), unit('kg', 'spool', 'kg', [0.25, 0.5, 1, 2, 3]), bare('colour', 'colour', ['black', 'white', 'grey', 'red', 'blue', 'green', 'yellow', 'orange', 'natural', 'silver'])],
    title: (p) => `${String(p.matter).toUpperCase()} filament ${p.d} mm, ${p.kg} kg, ${p.colour}`, of: (p) => `${FIL[s(p, 'matter')]![0]} paper`, make: 'extrude', how: 'dried pellets extruded to diameter (held to about ±0.03 mm), cooled and wound on a card spool',
    spec: (p) => { const [, rho, T] = FIL[s(p, 'matter')]!, m = (n(p, 'kg') * 1e6) / (rho * Math.PI * (n(p, 'd') / 2) ** 2); return `about ${(m / 1000).toFixed(0)} m on the spool (L = m / ρA, ρ ${rho}); print at about ${T} °C (typical)`; },
    box: (p) => [200, 200, n(p, 'kg') <= 0.5 ? 55 : 65], g: (p) => n(p, 'kg') * 1000 + 230,
  },
  {
    id: 'rope', name: 'rope and wire rope', path: 'Hardware/Lifting/Rope', says: 'braided fibre rope, or galvanised or stainless 7 × 19 wire rope', std: 'the diameters sold, any length cut to the centimetre',
    axes: [bare('matter', 'made of', ['polyester', 'nylon', 'pp', 'uhmw', 'steel', 'stainless']), ax('d', 'diameter', 'mm', (p) => (p.matter === 'steel' || p.matter === 'stainless' ? [1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12] : [2, 3, 4, 5, 6, 8, 10, 12, 14, 16])), unit('L', 'length', 'm', [5, 10, 20, 50, 100], [0.01, 500, 0.01])],
    title: (p) => `${p.matter === 'steel' || p.matter === 'stainless' ? `${p.matter === 'steel' ? 'galvanised' : 'stainless'} 7 × 19 wire rope` : `${p.matter === 'uhmw' ? 'UHMWPE (Dyneema-type)' : p.matter} braided rope`} ${p.d} mm, ${p.L} m`, of: (p) => (p.matter === 'steel' ? 'steel-spring zinc' : p.matter === 'stainless' ? 'stainless-316' : p.matter === 'polyester' ? 'pet' : p.matter === 'uhmw' ? 'pe' : s(p, 'matter')), make: 'draw', how: (p) => (p.matter === 'steel' || p.matter === 'stainless' ? 'drawn wires laid into seven strands of 19, closed round each other' : 'filaments spun into yarns and braided over a core'),
    spec: (p) => `${p.d} mm, ${p.L} m; its breaking load is on its maker's tag: work it at a fifth of that`, box: (p) => [n(p, 'd'), n(p, 'd'), Math.min(n(p, 'L') * 1000, 400)], g: (p) => gOf(cyl(n(p, 'd'), n(p, 'L') * 1000) * 0.6, p.matter === 'steel' || p.matter === 'stainless' ? 7.9 : p.matter === 'pp' || p.matter === 'uhmw' ? 0.92 : 1.3),
  },
  {
    id: 'tape', name: 'adhesive tape', path: 'Hardware/Adhesives and tape/Tape', says: 'a roll of pressure-sensitive tape', std: 'the kinds, widths and roll lengths sold (typical)',
    axes: [bare('type', 'kind', Object.keys(TAPES)), unit('w', 'width', 'mm', (p) => TAPES[s(p, 'type')]![2]), unit('L', 'roll length', 'm', (p) => TAPES[s(p, 'type')]![3])],
    title: (p) => `${TAPES[s(p, 'type')]![0]}, ${p.w} mm × ${p.L} m`, of: (p) => TAPES[s(p, 'type')]![1], make: 'laminate', how: 'a backing film or paper coated with a pressure-sensitive adhesive, slit and wound', spec: (p) => `${p.w} mm × ${p.L} m, about ${TAPES[s(p, 'type')]![4]} mm thick`,
    box: (p) => { const r = Math.sqrt((n(p, 'L') * 1000 * TAPES[s(p, 'type')]![4]) / Math.PI + 38 ** 2); return [2 * r, 2 * r, n(p, 'w')]; }, g: (p) => gOf(n(p, 'w') * n(p, 'L') * 1000 * TAPES[s(p, 'type')]![4], 1.2) + 8,
  },
  {
    id: 'adhesive', name: 'adhesive', path: 'Hardware/Adhesives and tape/Adhesives', says: 'a glue, by what it bonds and how it cures', std: 'the kinds and packs sold',
    axes: [bare('type', 'kind', Object.keys(GLUES)), bare('pack', 'pack', (p) => GLUES[s(p, 'type')]![2])],
    title: (p) => `${GLUES[s(p, 'type')]![0]}, ${p.pack}`, of: (p) => `${GLUES[s(p, 'type')]![1]} pe`, make: 'chemistry', how: (p) => GLUES[s(p, 'type')]![3], spec: (p) => GLUES[s(p, 'type')]![3],
    box: (p) => { const q = Number(/[\d.]+/.exec(s(p, 'pack'))![0]) * (/l$/.test(s(p, 'pack')) && !/ml$/.test(s(p, 'pack')) ? 1000 : 1); return /mm$/.test(s(p, 'pack')) ? [q, q, 200] : [Math.cbrt(q * 1000) * 0.8, Math.cbrt(q * 1000) * 0.8, Math.cbrt(q * 1000) * 1.8]; }, g: (p) => { const q = Number(/[\d.]+/.exec(s(p, 'pack'))![0]) * (/l$/.test(s(p, 'pack')) && !/ml$/.test(s(p, 'pack')) ? 1000 : 1); return /mm$/.test(s(p, 'pack')) ? q * 1.6 * 10 : q * 1.15 + 10; },
  },
  {
    id: 'enclosure', name: 'project enclosure', path: 'Electrical/Enclosures/Boxes', says: 'a box with a screw-down lid to house a circuit, sealed against dust and jets of water', std: 'the sizes sold (outside L × W × H), IP65 (typical)',
    axes: [bare('size', 'outside', BOXES), bare('matter', 'made of', ['abs', 'pc', 'aluminium'])],
    title: (p) => `enclosure ${String(p.size).replace(/x/g, ' × ')} mm, ${madeOf(p)[2]}`, of: (p) => `${madeOf(p)[0]} silicone screw-m3*4`, make: (p) => (p.matter === 'aluminium' ? 'cast' : 'mould'), alt: 'print', how: (p) => (p.matter === 'aluminium' ? 'die-cast in aluminium, powder-coated' : 'injection-moulded with bosses inside, a gasket in its lid'),
    spec: (p) => `${p.size} mm outside, walls about ${p.matter === 'aluminium' ? 3 : 2.5} mm; IP65 with its gasket`, box: (p) => String(p.size).split('x').map(Number) as [number, number, number], g: (p) => { const [a, b, c] = String(p.size).split('x').map(Number) as [number, number, number]; return gOf(2 * (a * b + b * c + a * c) * (p.matter === 'aluminium' ? 3 : 2.5), madeOf(p)[1]); },
  },
  {
    id: 'cablegland', name: 'cable gland', path: 'Electrical/Enclosures/Cable glands', says: 'a threaded fitting that seals and grips a cable where it enters a box', std: 'EN 62444 metric threads; clamping ranges typical; IP68',
    axes: [bare('thread', 'thread', Object.keys(GLAND)), bare('matter', 'made of', ['nylon', 'brass'])],
    title: (p) => `${p.thread} cable gland, ${madeOf(p)[2]}`, of: (p) => `${madeOf(p)[0]} nbr`, make: (p) => (p.matter === 'nylon' ? 'mould' : 'machine'), how: 'a body, a dome nut and a split rubber seal that the nut squeezes round the cable', spec: (p) => `${p.thread} × 1.5; takes cable ${GLAND[s(p, 'thread')]} mm across (typical); IP68`,
    box: (p) => { const d = Number(String(p.thread).slice(1)); return [d * 1.5, d * 1.5, d * 1.8]; }, g: (p) => { const d = Number(String(p.thread).slice(1)); return gOf(d ** 3 * 1.2, madeOf(p)[1]); },
  },
  {
    id: 'trunking', name: 'slotted cable duct', path: 'Electrical/Wire management/Cable duct', says: 'a slotted PVC channel with a clip-on lid, for wiring inside a panel', std: 'the sizes sold, cut to any length 10–2000 mm',
    axes: [bare('size', 'width × height', ['25x25', '25x40', '40x40', '40x60', '60x60', '60x80', '80x80', '100x100']), unit('L', 'length', 'mm', [1000, 2000], [10, 2000, 1])],
    title: (p) => `cable duct ${String(p.size).replace('x', ' × ')} mm, ${p.L} mm`, of: () => 'pvc', make: 'extrude', how: 'grey PVC extruded and slotted, its lid extruded to clip on', spec: (p) => `${p.size} mm; fill it to about 60 % (typical)`,
    box: (p) => { const [w, h] = String(p.size).split('x').map(Number) as [number, number]; return [w, h, n(p, 'L')]; }, g: (p) => { const [w, h] = String(p.size).split('x').map(Number) as [number, number]; return gOf((2 * w + 2 * h) * 1.6 * n(p, 'L') * 0.75, 1.4); },
  },
  {
    id: 'sleeving', name: 'cable sleeving', path: 'Electrical/Wire management/Sleeving', says: 'braided PET sleeving that expands over a bundle, or a spiral wrap that winds round it', std: 'the sizes sold, any length cut to the centimetre',
    axes: [bare('type', 'type', ['braided', 'spiral']), ax('d', 'size', 'mm', [3, 4, 6, 8, 10, 12, 16, 20, 25, 30, 40]), unit('L', 'length', 'm', [1, 5, 10, 25], [0.01, 100, 0.01])],
    title: (p) => `${p.type === 'braided' ? 'braided sleeving' : 'spiral wrap'} ${p.d} mm, ${p.L} m`, of: (p) => (p.type === 'braided' ? 'pet' : 'pe'), make: (p) => (p.type === 'braided' ? 'laminate' : 'extrude'), how: (p) => (p.type === 'braided' ? 'PET monofilament braided into a tube that widens when pushed together' : 'polyethylene strip extruded and cut in a helix'), spec: (p) => `${p.d} mm; ${p.type === 'braided' ? `takes bundles about ${(n(p, 'd') * 0.6).toFixed(0)}–${(n(p, 'd') * 1.6).toFixed(0)} mm` : 'wraps on and off anywhere'}`,
    box: (p) => [n(p, 'd'), n(p, 'd'), Math.min(n(p, 'L') * 1000, 400)], g: (p) => n(p, 'L') * n(p, 'd') * 1.2,
  },
  {
    id: 'butthinge', name: 'butt hinge', path: 'Hardware/Door and cabinet/Hinges', says: 'two leaves round a pin, set into a door\'s edge and its frame', std: 'the leaf lengths sold (typical leaf widths)',
    axes: [unit('L', 'length', 'mm', [25, 38, 50, 63, 75, 100, 125, 150]), bare('matter', 'made of', ['steel', 'brass', 'stainless'])],
    title: (p) => `butt hinge ${p.L} mm, ${madeOf(p)[2]}`, of: (p) => `${madeOf(p)[0]}*2 steel-low`, make: 'stamp', how: 'two leaves stamped and rolled round a pin, countersunk for screws', spec: (p) => `${p.L} mm long, about ${(n(p, 'L') * 0.7).toFixed(0)} mm open across (typical)`,
    box: (p) => [n(p, 'L') * 0.7, 2 + n(p, 'L') / 50, n(p, 'L')], g: (p) => gOf(n(p, 'L') * n(p, 'L') * 0.7 * (1 + n(p, 'L') / 75), madeOf(p)[1]),
  },
  {
    id: 'pianohinge', name: 'piano hinge', path: 'Hardware/Door and cabinet/Hinges', says: 'a long continuous hinge, cut to the length of a lid', std: 'the open widths sold, cut to any length 10–2000 mm',
    axes: [unit('w', 'open width', 'mm', [25, 32, 40, 50]), bare('matter', 'made of', ['steel', 'stainless', 'aluminium']), unit('L', 'length', 'mm', [300, 600, 1000, 1800], [10, 2000, 1])],
    title: (p) => `piano hinge ${p.w} mm, ${madeOf(p)[2]}, ${p.L} mm`, of: (p) => `${madeOf(p)[0]}*2 steel-low`, make: 'roll', how: 'two strips rolled round a long pin, punched for screws', spec: (p) => `${p.w} mm open; knuckles every 25 mm or so (typical)`,
    box: (p) => [n(p, 'w'), 2, n(p, 'L')], g: (p) => gOf(n(p, 'w') * 0.8 * n(p, 'L'), madeOf(p)[1]),
  },
  {
    id: 'pullhandle', name: 'pull handle', path: 'Hardware/Door and cabinet/Handles', says: 'a bar handle for a drawer or door, its screws on the 32 mm system', std: 'centres on the 32 mm system',
    axes: [unit('c', 'hole centres', 'mm', [64, 96, 128, 160, 192, 224, 256, 320, 448]), bare('matter', 'made of', ['zamak', 'stainless', 'aluminium'])],
    title: (p) => `pull handle ${p.c} mm centres, ${madeOf(p)[2]}`, of: (p) => `${madeOf(p)[0]} steel-low*2`, make: (p) => (p.matter === 'zamak' ? 'cast' : 'machine'), how: (p) => (p.matter === 'zamak' ? 'die-cast and plated' : 'bent from bar, brushed'), spec: (p) => `${p.c} mm between its M4 screws`,
    box: (p) => [n(p, 'c') + 20, 12, 35], g: (p) => gOf(cyl(12, n(p, 'c') + 60), madeOf(p)[1]),
  },
  {
    id: 'starknob', name: 'star knob', path: 'Hardware/Door and cabinet/Knobs', says: 'a moulded star-shaped grip on a threaded stud or insert, to tighten by hand', std: 'DIN 6336 sizes, M4–M16',
    axes: [bare('thread', 'thread', ['M4', 'M5', 'M6', 'M8', 'M10', 'M12', 'M16']), bare('form', 'form', ['female', 'male'])],
    title: (p) => `${p.thread} star knob, ${p.form === 'female' ? 'threaded insert' : 'threaded stud'}`, of: () => 'phenolic brass steel-low', make: 'mould', alt: 'print', how: 'phenolic moulded over a brass insert (or a steel stud)', spec: (p) => `${({ M4: 25, M5: 32, M6: 32, M8: 40, M10: 50, M12: 63, M16: 80 } as Record<string, number>)[s(p, 'thread')]} mm across (DIN 6336)`,
    box: (p) => { const D = ({ M4: 25, M5: 32, M6: 32, M8: 40, M10: 50, M12: 63, M16: 80 } as Record<string, number>)[s(p, 'thread')]!; return [D, D, D * 0.6 + (p.form === 'male' ? 25 : 0)]; }, g: (p) => { const D = ({ M4: 25, M5: 32, M6: 32, M8: 40, M10: 50, M12: 63, M16: 80 } as Record<string, number>)[s(p, 'thread')]!; return gOf(cyl(D, D * 0.5) * 0.55, 1.4); },
  },
  {
    id: 'drawerslide', name: 'drawer slide', path: 'Hardware/Door and cabinet/Drawer slides', says: 'a pair of telescoping steel rails on ball bearings that let a drawer run all the way out', std: 'the lengths sold in 50 mm steps; loads typical',
    axes: [unit('L', 'length', 'mm', range(250, 700, 50)), unit('kg', 'load', 'kg', [35, 45])],
    title: (p) => `drawer slides ${p.L} mm, full extension, ${p.kg} kg (a pair)`, of: () => 'steel-low*2 zinc steel-chrome pom', make: 'assemble', how: 'three roll-formed zinc-plated rails each side, balls in POM cages between them', spec: (p) => `${p.L} mm closed, ${p.L} mm of travel; ${p.kg} kg a pair (typical); 45 mm high`,
    box: (p) => [12.7, 45, n(p, 'L')], g: (p) => n(p, 'L') * 2.4,
  },
  {
    id: 'castor', name: 'castor', path: 'Mechanical/Wheels/Castors', says: 'a wheel on a plate or stem, swivelling, fixed, or swivelling with a brake', std: 'the wheel diameters sold; loads per castor typical',
    axes: [unit('d', 'wheel', 'mm', [30, 40, 50, 75, 100, 125, 160, 200]), bare('mount', 'mount', ['swivel', 'fixed', 'brake']), bare('tread', 'tread', ['pu', 'rubber', 'nylon'])],
    title: (p) => `${p.mount === 'brake' ? 'braked swivel' : p.mount} castor, ${p.d} mm ${p.tread === 'pu' ? 'polyurethane' : p.tread} wheel`, of: (p) => `steel-low zinc ${p.tread === 'pu' ? 'pu pp' : p.tread} bearing-ring*2 bearing-ball*14`, make: 'assemble', how: 'a pressed-steel fork (swivelling on a ball race) carrying a wheel on its axle',
    spec: (p) => `about ${({ 30: 20, 40: 30, 50: 40, 75: 60, 100: 80, 125: 100, 160: 150, 200: 200 } as Record<number, number>)[n(p, 'd')]} kg each (typical)`, box: (p) => [n(p, 'd') * 0.9 + 20, n(p, 'd') * 0.9 + 20, n(p, 'd') * 1.3 + 10], g: (p) => n(p, 'd') ** 2 * 0.075,
  },
  {
    id: 'heatsink', name: 'extruded heat sink', path: 'Electrical/Thermal/Heat sinks', says: 'an aluminium profile with fins, to carry heat from a part into the air', std: 'the profile widths and fin heights sold, cut to any length 5–1000 mm',
    axes: [ax('w', 'width', 'mm', [10, 14, 20, 25, 30, 40, 50, 60, 80, 100, 120, 150]), ax('h', 'fin height', 'mm', (p) => [5, 6, 10, 15, 20, 25, 30, 40].filter((h) => h <= n(p, 'w'))), unit('L', 'length', 'mm', [10, 20, 50, 100], [5, 1000, 1])],
    title: (p) => `heat sink ${p.w} × ${p.h} × ${p.L} mm`, of: () => 'al-6063', make: 'extrude', how: 'aluminium extruded with its fins, cut and anodised black',
    spec: (p) => { const fins = Math.max(2, Math.floor(n(p, 'w') / 4)), A = (fins * 2 * n(p, 'h') + n(p, 'w')) * n(p, 'L') / 100; return `${fins} fins, about ${A.toFixed(0)} cm² of surface; in still air about ${(1 / (0.0010 * A + 0.02)).toFixed(1)} K/W (estimate)`; },
    box: (p) => [n(p, 'w'), n(p, 'h'), n(p, 'L')], g: (p) => gOf(n(p, 'w') * n(p, 'h') * n(p, 'L') * 0.35, 2.7),
  },
  {
    id: 'thermalpad', name: 'thermal pad', path: 'Electrical/Thermal/Interface', says: 'a soft silicone sheet filled with ceramic, to carry heat across a gap', std: 'the thicknesses and conductivities sold',
    axes: [unit('t', 'thickness', 'mm', [0.5, 1, 1.5, 2, 3, 5]), unit('k', 'conductivity', 'W/mK', [1.5, 3, 6, 12]), bare('size', 'sheet', ['50x50', '100x100', '200x400'])],
    title: (p) => `thermal pad ${p.t} mm, ${p.k} W/m·K, ${String(p.size).replace('x', ' × ')} mm`, of: () => 'silicone alumina', make: 'mould', how: 'silicone loaded with alumina (or boron nitride) powder, calendered to thickness and cured',
    spec: (p) => `${((n(p, 't') / 1000) / (n(p, 'k') * 1e-4)).toFixed(2)} K/W across a square centimetre (R = t / kA)`, box: (p) => { const [a, b] = String(p.size).split('x').map(Number) as [number, number]; return [a, b, n(p, 't')]; }, g: (p) => { const [a, b] = String(p.size).split('x').map(Number) as [number, number]; return gOf(a * b * n(p, 't'), 2.8); },
  },
  {
    id: 'thermoswitch', name: 'bimetal thermostat', path: 'Electrical/Thermal/Thermostats', says: 'a snap disc of two metals that flips at a set temperature to open (or close) a circuit', std: 'the opening temperatures sold, every 5 °C',
    axes: [unit('T', 'opens at', 'C', range(40, 150, 5)), bare('contact', 'contact', ['NC', 'NO'])],
    title: (p) => `bimetal thermostat ${p.T} °C, ${p.contact === 'NC' ? 'opens' : 'closes'} on heating`, of: () => 'bimetal-strip phenolic silver brass', make: 'assemble', how: 'a domed bimetal disc that snaps over at its temperature, pushing a pin against a silver contact', spec: (p) => `${p.T} ± 5 °C; resets about 10–15 °C lower; 10 A at 250 V AC (typical)`,
    box: () => [16, 16, 20], g: () => 4,
  },
  {
    id: 'heatpipe', name: 'heat pipe', path: 'Electrical/Thermal/Heat pipes', says: 'a sealed copper tube with a wick and a little water: it boils at the hot end and condenses at the cold, carrying heat far better than solid copper', std: 'the diameters and lengths sold',
    axes: [ax('d', 'diameter', 'mm', [3, 4, 5, 6, 8, 10]), unit('L', 'length', 'mm', [100, 150, 200, 250, 300, 350, 400]), bare('shape', 'shape', ['round', 'flat'])],
    title: (p) => `heat pipe ${p.d} mm × ${p.L} mm, ${p.shape}`, of: () => 'copper water', make: 'assemble', how: 'copper tube lined with sintered copper powder, evacuated, a little water put in, sealed', spec: (p) => `${p.d} mm; carries about ${(n(p, 'd') ** 2 * 1.1).toFixed(0)} W lying flat (estimate)${p.shape === 'flat' ? '; flattened, it carries less' : ''}`,
    box: (p) => (p.shape === 'flat' ? [n(p, 'd') * 1.5, n(p, 'd') * 0.5, n(p, 'L')] : [n(p, 'd'), n(p, 'd'), n(p, 'L')]), g: (p) => gOf(ring(n(p, 'd'), n(p, 'd') - 0.6, n(p, 'L')), 8.96) * 1.4,
  },
  {
    id: 'tec', name: 'Peltier module', path: 'Electrical/Thermal/Thermoelectric', says: 'pairs of bismuth telluride pellets between ceramic plates: current pumps heat from one face to the other', std: 'the TEC1-127xx modules, 127 couples, 40 × 40 mm',
    axes: [bare('model', 'model', Object.keys(TEC))],
    title: (p) => `Peltier module TEC1-${p.model}`, of: () => 'te-pellet*254 alumina*2 copper-tab*254 solder', make: 'assemble', how: '254 n and p pellets soldered in series on copper tabs between two alumina plates',
    spec: (p) => { const [I, Q] = TEC[s(p, 'model')]!; return `about ${I} A at 15.4 V at most; pumps up to about ${Q} W with no temperature difference, or holds about 66 K difference at no load (typical); the hot side gets the electricity too`; }, box: () => [40, 40, 3.8], g: () => 22,
  },
];
