// Goods of the garage, the rigging loft, the lab, the warehouse and the joinery: car batteries, engine oil, wipers;
// bicycle tubes and chains; anchors, slings, straps, carabiners and lifting chain; flasks, cylinders, syringes and
// dishes; pallets, crates and boxes; acrylic, plywood and MDF; sealants; drain pipe. Numbers from EN 50342 (battery
// sizes), SAE J300 (oil grades), ETRTO (tubes), EN 1492 (sling colours and factors), EN 12195-2 (straps), EN 12275
// (carabiners), EN 818-2 (chain), ISO 1773, 4788 and 7886-1 (lab ware), EN 13698-1 (pallets), FEFCO 0201 (boxes),
// ISO 11600 (sealants), EN 1401 (sewer pipe), and the laws in each (E = V·Ah, p = F/A); a typical value is said so.

import { ax, bare, cyl, gOf, ring, unit, type KindDef, type P } from './core';

const n = (p: P, k: string) => Number(p[k]);
const s = (p: P, k: string) => String(p[k]);
const r1 = (x: number) => +x.toFixed(1);
const dims = (x: string) => x.split('x').map(Number) as [number, number, number];

/** EN 50342-2 L sizes by capacity (mm). */
const lSize = (Ah: number): [string, [number, number, number]] => (Ah <= 45 ? ['L1', [207, 175, 190]] : Ah <= 60 ? ['L2', [242, 175, 190]] : Ah <= 75 ? ['L3', [278, 175, 190]] : Ah <= 85 ? ['L4', [315, 175, 190]] : ['L5', [353, 175, 190]]);
/** SAE J300: kinematic viscosity at 100 °C (mm²/s) by hot grade, and cranking test temperature by W grade. */
const HOT: Record<string, [number, number]> = { '16': [6.1, 8.2], '20': [6.9, 9.3], '30': [9.3, 12.5], '40': [12.5, 16.3], '50': [16.3, 21.9] };
const COLD: Record<string, number> = { '0': -35, '5': -30, '10': -25, '15': -20, '20': -15 };
/** Inner tube widths (mm) by bead seat (ETRTO). */
const TUBE: Record<number, string[]> = { 406: ['40-54'], 559: ['40-54', '54-71'], 584: ['47-60', '54-71'], 622: ['18-25', '28-32', '35-47', '47-60'] };
/** Bicycle chain outer width by speeds (mm, typical). */
const CHAINW: Record<number, number> = { 1: 9.5, 6: 7.3, 7: 7.3, 8: 7.1, 9: 6.6, 10: 5.9, 11: 5.5, 12: 5.2 };
/** Wedge anchors: lengths sold and setting torque (N·m, typical) by thread. */
const ANCHOR: Record<number, [number[], number]> = { 6: [[55, 75, 95], 7], 8: [[50, 75, 95, 115, 135], 15], 10: [[70, 90, 110, 130, 150], 30], 12: [[80, 100, 120, 140, 180], 50], 16: [[125, 145, 170, 220], 100], 20: [[160, 200, 250], 200] };
/** EN 1492 sling colours by working load limit. */
const SLING: Record<number, string> = { 1: 'violet', 2: 'green', 3: 'yellow', 4: 'grey', 5: 'red', 6: 'brown', 8: 'blue', 10: 'orange' };
/** Ratchet straps: lashing capacities sold (daN) by width, and the ratchet's mass (g). */
const STRAP: Record<number, [number[], number]> = { 25: [[400, 800], 250], 35: [[1500, 2000], 450], 50: [[2500, 4000, 5000], 900] };
/** Carabiners: strengths (kN, typical: major axis closed, minor axis, gate open) by shape. */
const KARABINER: Record<string, [number, number, number, number]> = { D: [25, 8, 8, 55], HMS: [23, 7, 7, 75], oval: [22, 7, 6, 70] };
/** EN 818-2 grade 8 chain: working load limit (t) by diameter. */
const G80: Record<number, number> = { 6: 1.12, 7: 1.5, 8: 2, 10: 3.15, 13: 5.3, 16: 8, 18: 10, 20: 12.5, 22: 15 };
/** Lab glass: diameter × height (mm, typical) by volume (ml). */
const FLASK: Record<number, [number, number]> = { 25: [42, 70], 50: [51, 80], 100: [64, 105], 250: [85, 140], 500: [105, 180], 1000: [131, 225], 2000: [166, 280], 5000: [220, 365] };
const CYLINDER: Record<number, [number, number, number]> = { 5: [13, 120, 0.1], 10: [16, 140, 0.2], 25: [22, 170, 0.5], 50: [26, 200, 1], 100: [32, 250, 1], 250: [44, 335, 2], 500: [56, 390, 5], 1000: [68, 460, 10], 2000: [88, 520, 20] };
/** Syringe barrels (mm, typical) by volume (ml). */
const SYRINGE: Record<number, number> = { 1: 4.8, 2: 8.7, 3: 8.7, 5: 12, 10: 14.5, 20: 19.1, 30: 21.7, 50: 26.7, 60: 26.7 };
/** Pallets: size (mm), mass (kg) and the load it is rated for (kg) spread evenly, typical but for the EUR pallet's (EPAL). */
const PALLET: Record<string, [[number, number, number], number, number, string]> = { EUR1: [[1200, 800, 144], 25, 1500, 'EN 13698-1, EPAL'], EUR2: [[1200, 1000, 162], 33, 1250, 'typical'], EUR6: [[800, 600, 144], 9.5, 500, 'typical'], GMA: [[1219, 1016, 146], 18, 1250, '48 × 40 in, typical'] };
/** Euro containers: heights sold (mm) by footprint. */
const CRATE: Record<string, number[]> = { '600x400': [120, 170, 220, 270, 320, 420], '400x300': [120, 170, 220, 270, 320], '300x200': [120, 170, 220] };
/** Plywood: thicknesses, sheets, density (g/cm³, typical), what it is of. */
const PLY: Record<string, [number[], string[], number, string]> = { birch: [[4, 6, 9, 12, 15, 18, 24], ['1525x1525', '2440x1220'], 0.68, 'wood-veneer glue'], structural: [[9, 12, 15, 18, 25], ['2440x1220'], 0.5, 'wood-veneer glue'], marine: [[6, 9, 12, 18, 25], ['2440x1220'], 0.55, 'wood-veneer phenolic'] };
/** Sealants: movement class (ISO 11600, typical of the kind), what they are of, what each is for. */
const SEAL: Record<string, [string, string, string]> = { 'silicone-acetoxy': ['25LM', 'silicone pe', 'glass, tiles and sanitary joints; cures giving off acetic acid, which attacks metals'], 'silicone-neutral': ['25LM', 'silicone pe', 'metals, stone and plastics; cures without acid'], polyurethane: ['25LM', 'pu pe', 'construction joints; it can be painted'], acrylic: ['12.5P', 'pmma water pe', 'cracks indoors, to be painted over'], 'ms-polymer': ['25LM', 'pu silicone pe', 'bonding and sealing nearly anything, even wet'] };
/** Drain, soil and sewer pipe: wall (mm) by outside, and what it is for. */
const DRAIN: Record<number, [number, string]> = { 32: [1.8, 'waste (basins), EN 1329, typical wall'], 40: [1.9, 'waste (baths, showers), EN 1329, typical wall'], 50: [1.9, 'waste (kitchens), EN 1329, typical wall'], 75: [1.8, 'soil and waste, EN 1329, typical wall'], 110: [3.2, 'soil and sewer (EN 1401 SN4)'], 160: [4, 'sewer (EN 1401 SN4)'], 200: [4.9, 'sewer (EN 1401 SN4)'], 250: [6.2, 'sewer (EN 1401 SN4)'], 315: [7.7, 'sewer (EN 1401 SN4)'] };

export const GOODS: KindDef[] = [
  {
    id: 'carbattery', name: 'car battery', path: 'Mechanical/Vehicle parts/Batteries', says: 'a 12 V lead-acid starter battery: flooded, enhanced (EFB) or glass-mat (AGM)', std: 'EN 50342-2 L sizes; capacities sold; cold-cranking currents typical for each kind',
    axes: [unit('Ah', 'capacity', 'Ah', [36, 45, 55, 60, 70, 80, 95, 100]), bare('tech', 'kind', ['flooded', 'EFB', 'AGM'])],
    title: (p) => `12 V ${p.Ah} Ah ${p.tech} car battery (${lSize(n(p, 'Ah'))[0]})`, of: (p) => `battery-case battery-lid battery-post*2 plate-positive*${6 * Math.max(3, Math.round(n(p, 'Ah') / 12))} plate-negative*${6 * (Math.max(3, Math.round(n(p, 'Ah') / 12)) + 1)} plate-separator*${6 * Math.max(3, Math.round(n(p, 'Ah') / 12))} acid-electrolyte`, make: 'assemble', how: 'lead grids pasted with lead and lead dioxide, stacked with separators in six cells of acid, in a polypropylene case',
    spec: (p) => { const Ah = n(p, 'Ah'), cca = Math.round((Ah * ({ flooded: 8.5, EFB: 9.3, AGM: 10.5 } as Record<string, number>)[s(p, 'tech')]!) / 10) * 10; return `six 2 V cells: 12 V, ${Ah} Ah (20-hour rate): ${12 * Ah} Wh (E = V·Ah); about ${cca} A cold cranking (EN, typical); size ${lSize(Ah)[0]} (EN 50342-2)${p.tech === 'flooded' ? '' : '; for stop-start'}`; },
    box: (p) => lSize(n(p, 'Ah'))[1], g: (p) => n(p, 'Ah') * 250, look: 'box',
  },
  {
    id: 'motoroil', name: 'engine oil', path: 'Materials/Lubricants/Engine oils', says: 'multigrade engine oil by its SAE grade: thin enough cold, thick enough hot', std: 'SAE J300 grades; the cans sold',
    axes: [bare('grade', 'grade', ['0W-16', '0W-20', '5W-30', '5W-40', '10W-40', '15W-40', '20W-50']), unit('L', 'volume', 'L', [1, 4, 5])],
    title: (p) => `SAE ${p.grade} engine oil, ${p.L} l`, of: () => 'oil pe', make: 'chemistry', how: 'base oils blended with viscosity improvers, detergents and anti-wear additives',
    spec: (p) => { const [w, hot] = s(p, 'grade').split('W-') as [string, string], [lo, hi] = HOT[hot]!; return `${w}W: cranks at ${COLD[w]} °C; ${hot}: ${lo} to under ${hi} mm²/s at 100 °C (SAE J300)`; },
    box: (p) => ({ 1: [100, 60, 200], 4: [180, 110, 280], 5: [190, 130, 300] } as Record<number, [number, number, number]>)[n(p, 'L')]!, g: (p) => n(p, 'L') * 860 + 60 * n(p, 'L') ** 0.7, look: 'can',
  },
  {
    id: 'wiperblade', name: 'wiper blade', path: 'Mechanical/Vehicle parts/Wipers', says: 'a rubber blade on a frame or a spring band that sweeps a windscreen', std: 'the lengths sold, in inches',
    axes: [unit('in', 'length', 'in', [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 26, 28]), bare('type', 'type', ['conventional', 'flat', 'hybrid'])],
    title: (p) => `${p.in} in (${Math.round(n(p, 'in') * 25.4)} mm) ${p.type} wiper blade`, of: (p) => (p.type === 'conventional' ? 'wiper-rubber wiper-frame wiper-adapter' : p.type === 'flat' ? 'wiper-rubber wiper-spine wiper-spoiler wiper-adapter' : 'wiper-rubber wiper-spine wiper-frame wiper-spoiler wiper-adapter'), make: 'assemble', how: (p) => (p.type === 'conventional' ? 'a rubber blade held along a sprung steel frame of yokes' : 'a rubber blade on a curved spring-steel band that presses it on the glass evenly'),
    spec: (p) => `${Math.round(n(p, 'in') * 25.4)} mm (1 in = 25.4 mm); ${p.type === 'conventional' ? 'pressed at points by its frame' : 'pressed all along by its band'}`, box: (p) => [r1(n(p, 'in') * 25.4), 20, 25], g: (p) => n(p, 'in') * (p.type === 'conventional' ? 9 : 6), look: 'rod',
  },
  {
    id: 'innertube', name: 'bicycle inner tube', path: 'Mechanical/Vehicle parts/Wheels', says: 'a butyl rubber tube inside a tyre, by its ETRTO bead seat and the widths it fits', std: 'ETRTO bead seats and the width ranges sold; valves in use',
    axes: [unit('bead', 'bead seat', 'mm', Object.keys(TUBE).map(Number)), bare('w', 'fits widths', (p) => TUBE[n(p, 'bead')]!), bare('valve', 'valve', ['Presta-48', 'Presta-60', 'Presta-80', 'Schrader', 'Dunlop'])],
    title: (p) => `inner tube ${p.bead} × ${p.w} mm, ${s(p, 'valve').replace('-', ' ')}${/Presta/.test(s(p, 'valve')) ? ' mm' : ''}`, of: (p) => (/Presta/.test(s(p, 'valve')) ? 'rubber brass al-6061' : 'rubber brass'), make: 'mould', how: 'butyl rubber extruded as a tube, cut, its ends joined round in a mould, its valve vulcanised in',
    spec: (p) => `for tyres ${p.w} mm wide on a ${p.bead} mm bead seat (ETRTO); ${/Presta/.test(s(p, 'valve')) ? `a Presta valve ${s(p, 'valve').split('-')[1]} mm long, for a 6 mm hole` : p.valve === 'Schrader' ? 'a Schrader (car) valve, for an 8.5 mm hole' : 'a Dunlop (Woods) valve, for an 8.5 mm hole'}`,
    box: (p) => { const w = Number(s(p, 'w').split('-')[1]), D = n(p, 'bead') + 2 * w; return [D, D, w]; }, g: (p) => { const [a, b] = s(p, 'w').split('-').map(Number) as [number, number], w = (a + b) / 2; return Math.PI * (n(p, 'bead') + w) * w * 0.002 + 8; }, look: 'torus',
  },
  {
    id: 'bikechain', name: 'bicycle chain', path: 'Mechanical/Vehicle parts/Drivetrain', says: 'a roller chain at half-inch pitch, as wide as the speeds of its cassette allow', std: 'ISO 9633 pitch; widths typical by speeds; the link counts sold',
    axes: [unit('sp', 'speeds', 'sp', Object.keys(CHAINW).map(Number)), unit('links', 'links', 'L', [112, 114, 116, 118, 120, 126])],
    title: (p) => `${n(p, 'sp') === 1 ? 'single-speed' : `${p.sp}-speed`} bicycle chain, ${p.links} links`, of: (p) => `chain-plate-inner*${n(p, 'links')} chain-plate-outer*${n(p, 'links')} chain-pin*${n(p, 'links') / 2} chain-roller*${n(p, 'links') / 2}`, make: 'assemble', how: 'inner and outer plates stamped from steel, pressed with pins and rollers, hardened, plated',
    spec: (p) => `12.7 mm (½ in) pitch (ISO 9633); ${n(p, 'sp') === 1 ? '1/8 in rollers' : '3/32 in rollers'}, about ${CHAINW[n(p, 'sp')]} mm wide (typical); ${r1((n(p, 'links') * 12.7) / 10)} cm long`,
    box: (p) => [r1(n(p, 'links') * 12.7 / Math.PI), r1(n(p, 'links') * 12.7 / Math.PI), CHAINW[n(p, 'sp')]!], g: (p) => n(p, 'links') * (n(p, 'sp') >= 10 ? 2.2 : 2.5), look: 'loop',
  },
  {
    id: 'wedgeanchor', name: 'wedge anchor', path: 'Hardware/Fasteners/Anchors', says: 'a stud with a clip at its end: set in a drilled hole in concrete, its nut pulls it out against the clip, which wedges it fast', std: 'the threads and lengths sold; setting torques typical',
    axes: [ax('M', 'thread', '', Object.keys(ANCHOR).map(Number)), ax('L', 'length', 'mm', (p) => ANCHOR[n(p, 'M')]![0]), bare('finish', 'finish', ['zinc', 'A4'])],
    title: (p) => `M${p.M} × ${p.L} wedge anchor, ${p.finish === 'A4' ? 'A4 stainless' : 'zinc-plated'}`, of: (p) => (p.finish === 'A4' ? 'stainless-316*3' : 'steel-low*3 zinc'), make: 'cold-head', how: 'a cold-formed stud with a cone at its end and a wrapped steel clip, a nut and a washer',
    spec: (p) => `drill ${p.M} mm into the concrete, set, then tighten to about ${ANCHOR[n(p, 'M')]![1]} N·m (typical); what it holds depends on the concrete and the edge distance: see its approval`,
    box: (p) => [n(p, 'M') * 2.2, n(p, 'M') * 2.2, n(p, 'L')], g: (p) => gOf(cyl(n(p, 'M') * 0.9, n(p, 'L')), 7.85) + n(p, 'M') ** 2 * 0.3, look: 'screw hex',
  },
  {
    id: 'liftingsling', name: 'lifting sling', path: 'Hardware/Lifting/Slings', says: 'a polyester sling, flat webbing or a round sling, coloured by what it lifts', std: 'EN 1492-1 and -2: colours by WLL, mode factors, 7 : 1; lengths to the half metre',
    axes: [bare('form', 'form', ['flat', 'round']), unit('t', 'working load limit', 't', Object.keys(SLING).map(Number)), unit('L', 'length', 'm', [1, 1.5, 2, 3, 4, 5, 6], [1, 20, 0.5])],
    title: (p) => `${p.t} t ${p.form === 'flat' ? 'flat webbing' : 'round'} sling, ${p.L} m (${SLING[n(p, 't')]})`, of: () => 'webbing sewing-thread', make: 'assemble', how: (p) => (p.form === 'flat' ? 'polyester webbing woven, its ends sewn back into eyes' : 'a core of polyester yarn loops in a tubular woven cover'),
    spec: (p) => { const t = n(p, 't'); return `${SLING[t]}: ${t} t straight, ${r1(t * 0.8)} t choked, ${t * 2} t in a basket hung straight, ${r1(t * 1.4)} t at up to 45° (EN 1492); breaks at no less than ${7 * t} t (7 : 1)`; },
    box: (p) => [p.form === 'flat' ? 30 * n(p, 't') : 20 + 8 * n(p, 't'), 10, r1((n(p, 'L') * 1000) / 2)], g: (p) => n(p, 'L') * n(p, 't') * 120, look: 'loop',
  },
  {
    id: 'ratchetstrap', name: 'ratchet strap', path: 'Hardware/Lifting/Lashing', says: 'polyester webbing tightened by a ratchet: what holds a load on a vehicle', std: 'EN 12195-2 lashing capacities; the widths and lengths sold',
    axes: [ax('w', 'width', 'mm', Object.keys(STRAP).map(Number)), unit('LC', 'lashing capacity', 'daN', (p) => STRAP[n(p, 'w')]![0]), unit('L', 'length', 'm', [4, 5, 6, 8, 10, 12])],
    title: (p) => `${p.w} mm ratchet strap, LC ${p.LC} daN, ${p.L} m`, of: () => 'webbing sewing-thread ratchet strap-hook*2', make: 'assemble', how: 'polyester webbing sewn to hooks, threaded through a pressed-steel ratchet',
    spec: (p) => { const kN = n(p, 'LC') / 100; return `LC ${p.LC} daN (${kN} kN, ${((kN * 1000) / 9806.65).toFixed(2)} t-force) pulled straight (EN 12195-2); over a load, both of its legs hold: up to ${2 * kN} kN in all`; }, box: (p) => [n(p, 'w'), 60, 250], g: (p) => n(p, 'L') * n(p, 'w') * 0.9 + STRAP[n(p, 'w')]![1], look: 'loop',
  },
  {
    id: 'carabiner', name: 'carabiner', path: 'Hardware/Lifting/Carabiners', says: 'a sprung-gate link of aluminium alloy, for ropes', std: 'EN 12275 (at least 20 kN closed along its spine); strengths typical',
    axes: [bare('shape', 'shape', Object.keys(KARABINER)), bare('gate', 'gate', (p) => (p.shape === 'HMS' ? ['screwgate', 'autolock'] : ['screwgate', 'snapgate', 'wiregate']))],
    title: (p) => `${p.shape === 'HMS' ? 'HMS pear' : p.shape === 'D' ? 'D' : 'oval'} carabiner, ${p.gate}`, of: (p) => `al-7075 steel-spring${p.gate === 'wiregate' ? '' : ' steel-low'}`, make: 'forge', how: 'hot-forged from 7075 aluminium bar, anodised, its gate sprung',
    spec: (p) => { const [maj, min, open] = KARABINER[s(p, 'shape')]!; return `closed along its spine ${maj} kN, across ${min} kN, gate open ${open} kN (typical; EN 12275: at least 20 kN closed)${p.gate === 'screwgate' || p.gate === 'autolock' ? '; its gate locks' : ''}`; },
    box: (p) => (p.shape === 'HMS' ? [70, 12, 110] : [58, 12, 105]), g: (p) => KARABINER[s(p, 'shape')]![3], look: 'ring',
  },
  {
    id: 'liftchain', name: 'lifting chain', path: 'Hardware/Lifting/Chain', says: 'grade 80 alloy chain for slings and hoists', std: 'EN 818-2 working load limits, 4 : 1; any length to the decimetre',
    axes: [ax('d', 'diameter', 'mm', Object.keys(G80).map(Number)), unit('L', 'length', 'm', [1, 2, 5, 10], [0.1, 100, 0.1])],
    title: (p) => `${p.d} mm grade 80 lifting chain, ${p.L} m`, of: () => 'steel-alloy', make: 'weld', how: 'alloy steel wire bent into links, flash-butt welded, quenched and tempered, proof-loaded',
    spec: (p) => `WLL ${G80[n(p, 'd')]} t straight (EN 818-2, grade 8); breaks at no less than ${r1(4 * G80[n(p, 'd')]!)} t (4 : 1); ${(22 * n(p, 'd') ** 2 / 1000).toFixed(2)} kg a metre (typical)`, box: (p) => (n(p, 'L') >= 2 ? [300, 300, 120] : [r1(n(p, 'L') * 1000), n(p, 'd') * 3.4, n(p, 'd') * 1.3]), g: (p) => 22 * n(p, 'd') ** 2 * n(p, 'L'), look: (p) => `coil w${p.d}`,
  },
  {
    id: 'erlenmeyer', name: 'Erlenmeyer flask', path: 'Lab/Glassware/Flasks', says: 'a conical flask with a narrow neck: for swirling and heating without splashing', std: 'ISO 1773 narrow-neck sizes; dimensions typical; borosilicate 3.3',
    axes: [unit('ml', 'volume', 'ml', Object.keys(FLASK).map(Number))],
    title: (p) => `${p.ml} ml Erlenmeyer flask, narrow neck`, of: () => 'borosilicate', make: 'blow', how: 'borosilicate tube heated and blown into its cone, its neck and rim formed',
    spec: (p) => { const [d, h] = FLASK[n(p, 'ml')]!; return `${d} × ${h} mm (ISO 1773, typical); can be heated over a flame on a gauze`; }, box: (p) => { const [d, h] = FLASK[n(p, 'ml')]!; return [d, d, h]; }, g: (p) => { const [d, h] = FLASK[n(p, 'ml')]!; return gOf(Math.PI * d * h * 0.6 * (1 + d / 150), 2.23); }, look: 'dome',
  },
  {
    id: 'gradcylinder', name: 'measuring cylinder', path: 'Lab/Glassware/Cylinders', says: 'a tall graduated cylinder on a foot, read at the bottom of the meniscus', std: 'ISO 4788 sizes; class A to about half a division, B about a division (approximately); dimensions typical',
    axes: [unit('ml', 'volume', 'ml', Object.keys(CYLINDER).map(Number)), bare('cls', 'class', ['A', 'B'])],
    title: (p) => `${p.ml} ml measuring cylinder, class ${p.cls}`, of: () => 'borosilicate', make: 'blow', how: 'drawn borosilicate tube on a moulded foot, graduated and fired',
    spec: (p) => { const [, , div] = CYLINDER[n(p, 'ml')]!; return `marked every ${div} ml; within about ±${p.cls === 'A' ? div / 2 : div} ml (ISO 4788 class ${p.cls}, approximately)`; }, box: (p) => { const [d, h] = CYLINDER[n(p, 'ml')]!; return [r1(d * 2.2), r1(d * 2.2), h]; }, g: (p) => { const [d, h] = CYLINDER[n(p, 'ml')]!; return gOf(Math.PI * d * h * 1.2, 2.23) + d * d * 0.1; }, look: 'tube',
  },
  {
    id: 'syringe', name: 'syringe', path: 'Lab/Consumables/Syringes', says: 'a plastic barrel and plunger: a measured volume drawn in and pushed out', std: 'ISO 7886-1 sizes, Luer ends (ISO 80369-7); barrels typical',
    axes: [unit('ml', 'volume', 'ml', Object.keys(SYRINGE).map(Number)), bare('tip', 'tip', ['luer-slip', 'luer-lock'])],
    title: (p) => `${p.ml} ml syringe, ${s(p, 'tip').replace('-', ' ')}`, of: () => 'pp rubber', make: 'mould', how: 'a moulded polypropylene barrel and plunger with a rubber stopper',
    spec: (p) => { const d = SYRINGE[n(p, 'ml')]!, A = (Math.PI * (d / 1000) ** 2) / 4; return `${d} mm barrel (typical): 10 N on its plunger makes p = F / A = ${((10 / A) / 1000).toFixed(0)} kPa; ${p.tip === 'luer-lock' ? 'a needle or line screws on' : 'a needle pushes on'}`; },
    box: (p) => { const d = SYRINGE[n(p, 'ml')]!, L = (n(p, 'ml') * 1000) / ((Math.PI * d * d) / 4) + 30; return [r1(d * 1.6), r1(d * 1.6), r1(L * 1.6)]; }, g: (p) => 1 + n(p, 'ml') * 0.45, look: 'tube',
  },
  {
    id: 'petridish', name: 'Petri dish', path: 'Lab/Consumables/Dishes', says: 'a shallow round dish with a lid, for cultures', std: 'the diameters sold; polystyrene, sterile',
    axes: [ax('d', 'diameter', 'mm', [35, 60, 90, 100, 150]), bare('vent', 'lid', ['vented', 'unvented'])],
    title: (p) => `${p.d} mm Petri dish, ${p.vent}`, of: () => 'ps', make: 'mould', how: 'injection-moulded clear polystyrene, sterilised by irradiation',
    spec: (p) => `${p.d} mm; ${p.vent === 'vented' ? 'ribs under its lid let air in' : 'its lid sits tight'}; holds about ${((Math.PI * (n(p, 'd') / 2) ** 2 * 5) / 1000).toFixed(0)} ml of agar 5 mm deep`, box: (p) => [n(p, 'd') + 2, n(p, 'd') + 2, n(p, 'd') <= 35 ? 10 : n(p, 'd') >= 150 ? 20 : 15], g: (p) => n(p, 'd') ** 2 * 0.0022, look: 'can',
  },
  {
    id: 'pallet', name: 'pallet', path: 'Materials/Packaging/Pallets', says: 'a wooden platform a fork-lift lifts by its gaps', std: 'EN 13698-1 (the EUR pallet, EPAL ratings); the others typical',
    axes: [bare('type', 'type', Object.keys(PALLET))],
    title: (p) => `${p.type === 'GMA' ? 'GMA' : s(p, 'type').replace('EUR', 'EUR ')} pallet, ${PALLET[s(p, 'type')]![0].slice(0, 2).join(' × ')} mm`, of: () => 'pallet-board*11 pallet-block*9 pallet-nail*78', make: 'assemble', how: 'sawn boards and blocks nailed together',
    spec: (p) => { const [, kg, load, std] = PALLET[s(p, 'type')]!; return `about ${kg} kg; carries ${load} kg spread evenly (${std})${p.type === 'EUR1' ? '; 4000 kg stacked on flat ground' : ''}`; }, box: (p) => PALLET[s(p, 'type')]![0], g: (p) => PALLET[s(p, 'type')]![1] * 1000, look: 'box',
  },
  {
    id: 'eurocontainer', name: 'Euro container', path: 'Materials/Packaging/Crates', says: 'a stacking crate of polypropylene in the Euro footprint, so many fit a pallet', std: 'the 600 × 400 footprint and its divisions; heights sold',
    axes: [bare('foot', 'footprint', Object.keys(CRATE)), ax('h', 'height', 'mm', (p) => CRATE[s(p, 'foot')]!)],
    title: (p) => `${s(p, 'foot').replace('x', ' × ')} × ${p.h} mm Euro container`, of: () => 'pp', make: 'mould', how: 'injection-moulded polypropylene with ribbed walls and a reinforced base',
    spec: (p) => { const [L, W] = dims(s(p, 'foot')); return `about ${(((L - 25) * (W - 25) * (n(p, 'h') - 10)) / 1e6).toFixed(0)} l inside; ${(1200 * 800) / (L * W)} to a EUR pallet`; }, box: (p) => { const [L, W] = dims(s(p, 'foot')); return [L, W, n(p, 'h')]; }, g: (p) => { const [L, W] = dims(s(p, 'foot')); return (L * W + 2 * (L + W) * n(p, 'h')) * 0.0035; }, look: 'box',
  },
  {
    id: 'cardboardbox', name: 'cardboard box', path: 'Materials/Packaging/Boxes', says: 'a corrugated box of the regular slotted style, made to any size', std: 'FEFCO 0201; any inside size 50–1500 mm by the millimetre; board weights typical',
    axes: [ax('L', 'length', 'mm', [200, 300, 400, 500, 600], [50, 1500, 1]), ax('W', 'width', 'mm', [150, 200, 300, 400], [50, 1500, 1]), ax('H', 'height', 'mm', [100, 150, 200, 300, 400], [50, 1500, 1]), bare('flute', 'board', ['C', 'BC'])],
    title: (p) => `${p.L} × ${p.W} × ${p.H} mm box, ${p.flute === 'C' ? 'single wall' : 'double wall'}`, of: () => 'corrugated-board glue', make: 'assemble', how: 'kraft liners glued to fluted paper, cut and creased to its blank, its maker\'s joint glued',
    spec: (p) => { const L = n(p, 'L'), W = n(p, 'W'), H = n(p, 'H'), a = ((2 * L + 2 * W + 35) * (H + W)) / 1e6; return `FEFCO 0201: its blank (2L + 2W + 35) × (H + W) = ${a.toFixed(2)} m² of ${p.flute === 'C' ? 'C flute, about 4 mm' : 'BC double wall, about 7 mm'}; holds ${((L * W * H) / 1e6).toFixed(1)} l`; },
    box: (p) => [n(p, 'L') + 8, n(p, 'W') + 8, n(p, 'H') + 8], g: (p) => (((2 * n(p, 'L') + 2 * n(p, 'W') + 35) * (n(p, 'H') + n(p, 'W'))) / 1e6) * (p.flute === 'C' ? 500 : 800), look: 'box',
  },
  {
    id: 'acrylicsheet', name: 'acrylic sheet', path: 'Materials/Sheet/Plastic sheet', says: 'PMMA sheet: clear as glass, half its weight, far harder to break', std: 'the thicknesses and sheet sizes sold; light transmission typical',
    axes: [bare('kind', 'kind', ['clear-cast', 'clear-extruded', 'opal', 'black']), ax('t', 'thickness', 'mm', (p) => (p.kind === 'clear-extruded' ? [1, 2, 3, 4, 5, 6, 8, 10] : [2, 3, 4, 5, 6, 8, 10, 12, 15, 20])), bare('sheet', 'sheet', ['1000x500', '1000x600', '2000x1000', '3050x2050'])],
    title: (p) => `${p.t} mm ${s(p, 'kind').replace('-', ' ')} acrylic, ${String(p.sheet).replace('x', ' × ')} mm`, of: () => 'pmma', make: (p) => (p.kind === 'clear-extruded' ? 'extrude' : 'cast'), how: (p) => (p.kind === 'clear-extruded' ? 'PMMA extruded through a slot die and polished between rolls' : 'methyl methacrylate cast and set between glass plates'),
    spec: (p) => { const [L, W] = dims(s(p, 'sheet')); return `${p.kind === 'opal' ? 'diffuses light evenly' : p.kind === 'black' ? 'opaque' : 'passes about 92 % of light (typical)'}; ${((L * W * n(p, 't') * 1.19) / 1e6).toFixed(1)} kg a sheet (1.19 g/cm³)${p.kind === 'clear-cast' ? '; cast cuts and lasers cleaner than extruded' : ''}`; },
    box: (p) => { const [L, W] = dims(s(p, 'sheet')); return [L, W, n(p, 't')]; }, g: (p) => { const [L, W] = dims(s(p, 'sheet')); return gOf(L * W * n(p, 't'), 1.19); }, look: 'sheet',
  },
  {
    id: 'plywood', name: 'plywood', path: 'Materials/Sheet/Wood sheet', says: 'veneers glued cross-grain: a board that is strong both ways and does not split', std: 'the grades, thicknesses and sheets sold; densities typical',
    axes: [bare('grade', 'grade', Object.keys(PLY)), ax('t', 'thickness', 'mm', (p) => PLY[s(p, 'grade')]![0]), bare('sheet', 'sheet', (p) => PLY[s(p, 'grade')]![1])],
    title: (p) => `${p.t} mm ${p.grade} plywood, ${String(p.sheet).replace('x', ' × ')} mm`, of: (p) => PLY[s(p, 'grade')]![3], make: 'laminate', how: (p) => `${p.grade === 'birch' ? 'birch' : p.grade === 'marine' ? 'tropical hardwood' : 'softwood'} veneers peeled, dried, glued cross-grain and pressed hot${p.grade === 'marine' ? ' with a waterproof phenolic glue' : ''}`,
    spec: (p) => { const [L, W] = dims(s(p, 'sheet')), rho = PLY[s(p, 'grade')]![2], plies = Math.max(3, 2 * Math.round(n(p, 't') / 2.8) + 1); return `about ${plies} plies (typical); ${((L * W * n(p, 't') * rho) / 1e6).toFixed(1)} kg a sheet at ${rho} g/cm³ (typical)`; },
    box: (p) => { const [L, W] = dims(s(p, 'sheet')); return [L, W, n(p, 't')]; }, g: (p) => { const [L, W] = dims(s(p, 'sheet')); return gOf(L * W * n(p, 't'), PLY[s(p, 'grade')]![2]); }, look: 'sheet',
  },
  {
    id: 'mdf', name: 'MDF board', path: 'Materials/Sheet/Wood sheet', says: 'wood fibres pressed with resin: a dense, even board that machines and paints smooth', std: 'the thicknesses and sheets sold; densities typical',
    axes: [ax('t', 'thickness', 'mm', [3, 6, 9, 12, 15, 18, 25]), bare('grade', 'grade', ['standard', 'MR']), bare('sheet', 'sheet', ['2440x1220', '2800x2070'])],
    title: (p) => `${p.t} mm ${p.grade === 'MR' ? 'moisture-resistant ' : ''}MDF, ${String(p.sheet).replace('x', ' × ')} mm`, of: () => 'wood glue', make: 'laminate', how: 'wood chips steamed and ground to fibres, mixed with resin, formed into a mat and pressed hot',
    spec: (p) => { const [L, W] = dims(s(p, 'sheet')), rho = n(p, 't') <= 6 ? 0.8 : 0.74; return `${((L * W * n(p, 't') * rho) / 1e6).toFixed(1)} kg a sheet at ${rho} g/cm³ (typical)${p.grade === 'MR' ? '; swells less when damp' : ''}`; },
    box: (p) => { const [L, W] = dims(s(p, 'sheet')); return [L, W, n(p, 't')]; }, g: (p) => { const [L, W] = dims(s(p, 'sheet')); return gOf(L * W * n(p, 't'), n(p, 't') <= 6 ? 0.8 : 0.74); }, look: 'sheet',
  },
  {
    id: 'sealant', name: 'sealant', path: 'Hardware/Adhesives and tape/Sealants', says: 'a gun-grade sealant in a cartridge: it fills a joint and moves with it', std: 'ISO 11600 movement classes (typical of each kind); EU cartridge sizes',
    axes: [bare('type', 'type', Object.keys(SEAL)), unit('ml', 'cartridge', 'ml', [290, 310]), bare('colour', 'colour', ['clear', 'white', 'grey', 'black'])],
    title: (p) => `${s(p, 'type').replace('-', ' ')} sealant, ${p.colour}, ${p.ml} ml`, of: (p) => SEAL[s(p, 'type')]![1], make: 'chemistry', how: 'a curing polymer paste with its fillers, filled into a polyethylene cartridge',
    spec: (p) => { const [cls, , use] = SEAL[s(p, 'type')]!; return `ISO 11600 class ${cls}: a joint may move ±${cls.replace(/[A-Z]+$/, '')} % of its width (typical of the kind); for ${use}; a ${p.ml} ml cartridge fills about ${((n(p, 'ml') * 1000) / 100 / 1000).toFixed(1)} m of a 10 × 10 mm joint`; },
    box: () => [50, 50, 215], g: (p) => n(p, 'ml') * 1.3 + 40, look: 'can',
  },
  {
    id: 'drainpipe', name: 'drain pipe', path: 'Fluid/Tubing and hose/Plastic pipe', says: 'PVC-U pipe for waste, soil and sewer', std: 'EN 1329 (waste and soil) and EN 1401 SN4 (sewer) sizes; any length to 6 m, cut to the centimetre',
    axes: [ax('d', 'outside', 'mm', Object.keys(DRAIN).map(Number)), unit('L', 'length', 'm', [1, 3, 6], [0.1, 6, 0.01])],
    title: (p) => `${p.d} mm PVC drain pipe, ${p.L} m`, of: () => 'pvc', make: 'extrude', how: 'PVC-U extruded, its socket formed on one end',
    spec: (p) => `${p.d} × ${DRAIN[n(p, 'd')]![0]} mm: ${DRAIN[n(p, 'd')]![1]}`, box: (p) => [n(p, 'd'), n(p, 'd'), r1(n(p, 'L') * 1000)], g: (p) => gOf(ring(n(p, 'd'), n(p, 'd') - 2 * DRAIN[n(p, 'd')]![0], n(p, 'L') * 1000), 1.4), look: 'tube',
  },
];
