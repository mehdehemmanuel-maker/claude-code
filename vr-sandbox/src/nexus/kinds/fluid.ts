// Fluid power and plumbing: fittings, hose barbs, push-in fittings, tubing and hose, clamps, valves, cylinders, copper
// tube, and the seals that keep it all in. Thread sizes from ISO 228-1 (BSP parallel); cylinders from ISO 6432 and
// ISO 15552; hose clamps from DIN 3017; copper tube from EN 1057; shaft seals from DIN 3760.

import { ax, bare, cyl, gOf, matOf, pref, ring, unit, type KindDef, type P } from './core';

const n = (p: P, k: string) => Number(p[k]);
const s = (p: P, k: string) => String(p[k]);
const madeOf = (p: P) => matOf(p.matter);
/** ISO 228-1 parallel pipe threads: major diameter (mm) and threads an inch. */
export const BSP: Record<string, [number, number]> = { 'G1/8': [9.728, 28], 'G1/4': [13.157, 19], 'G3/8': [16.662, 19], 'G1/2': [20.955, 14], 'G3/4': [26.441, 14], G1: [33.249, 11], 'G1-1/4': [41.91, 11], 'G1-1/2': [47.803, 11], G2: [59.614, 11] };
const G = (p: P, k = 'size') => BSP[s(p, k)]?.[0] ?? 5;
/** ISO 15552 rods, by bore; ISO 6432 small bores' rods. */
const ROD: Record<number, number> = { 8: 4, 10: 4, 12: 6, 16: 6, 20: 8, 25: 10, 32: 12, 40: 16, 50: 20, 63: 20, 80: 25, 100: 25, 125: 32 };
/** DIN 3017 worm-drive clamp ranges (mm). */
const CLAMP = ['8-12', '10-16', '12-20', '16-25', '20-32', '25-40', '32-50', '40-60', '50-70', '60-80', '70-90', '80-100', '90-110', '100-120'];
/** EN 1057 copper tube: outside → the walls sold. */
const CU: Record<number, number[]> = { 6: [0.6, 0.8, 1], 8: [0.6, 0.8, 1], 10: [0.7, 0.8, 1], 12: [0.8, 1], 15: [0.7, 1], 18: [0.8, 1], 22: [0.9, 1, 1.2], 28: [0.9, 1, 1.2], 35: [1.2, 1.5], 42: [1.2, 1.5], 54: [1.2, 1.5, 2] };
/** DIN 3760 rotary shaft seals: shaft × bore × width, the common sizes. */
const LIP = ['8x22x7', '10x22x7', '12x22x7', '12x28x7', '15x26x7', '15x30x7', '17x30x7', '17x35x7', '20x35x7', '20x40x7', '25x40x7', '25x47x7', '30x47x7', '30x52x7', '35x52x7', '35x55x8', '40x55x8', '40x62x8', '45x62x8', '50x65x8', '50x72x8', '60x80x8', '70x90x10', '80x100x10'];

export const FLUID: KindDef[] = [
  {
    id: 'pipefitting', name: 'threaded pipe fitting', path: 'Fluid/Fittings/Threaded fittings', says: 'an elbow, tee, socket, nipple, plug, cap, union or cross for parallel-threaded pipe', std: 'ISO 228-1 thread sizes G1/8–G2; malleable iron to EN 10242',
    axes: [bare('type', 'type', ['elbow', 'tee', 'socket', 'nipple', 'plug', 'cap', 'union', 'cross']), bare('size', 'thread', Object.keys(BSP)), bare('matter', 'made of', ['brass', 'stainless', 'castiron'])],
    title: (p) => `${p.size} ${p.type}, ${p.matter === 'castiron' ? 'malleable iron' : madeOf(p)[2]}`, of: (p) => madeOf(p)[0], make: (p) => (p.matter === 'castiron' ? 'cast' : 'machine'), alt: 'machine', how: (p) => (p.matter === 'castiron' ? 'cast in malleable iron, annealed, threaded, galvanised' : p.matter === 'brass' ? 'hot-forged brass, machined and threaded' : 'investment-cast stainless, machined and threaded'),
    spec: (p) => `${p.size}: ${G(p)} mm over its thread, ${BSP[s(p, 'size')]![1]} threads an inch (ISO 228-1)`, box: (p) => { const d = G(p) * 1.35, arms = ({ elbow: 2, tee: 3, cross: 4 } as Record<string, number>)[s(p, 'type')] ?? 1; return arms > 1 ? [d * 2.2, d * (arms > 2 ? 2.2 : 1.6), d] : [d, d, d * 1.5]; }, g: (p) => { const d = G(p) * 1.35, arms = ({ elbow: 2, tee: 3, cross: 4, union: 3 } as Record<string, number>)[s(p, 'type')] ?? 1.3; return gOf(ring(d, G(p) * 0.85, d * 1.1) * arms, madeOf(p)[1]); },
  },
  {
    id: 'hosebarb', name: 'hose barb', path: 'Fluid/Fittings/Hose barbs', says: 'a threaded fitting with a barbed tail that grips the inside of a soft hose', std: 'the threads and hose sizes sold',
    axes: [bare('thread', 'thread', ['M5', 'G1/8', 'G1/4', 'G3/8', 'G1/2', 'G3/4', 'G1']), ax('hose', 'for hose bore', 'mm', (p) => ({ M5: [3, 4], 'G1/8': [3, 4, 5, 6], 'G1/4': [4, 5, 6, 8, 10], 'G3/8': [6, 8, 10, 12], 'G1/2': [10, 12, 13, 16], 'G3/4': [16, 19], G1: [19, 25] } as Record<string, number[]>)[s(p, 'thread')]!), bare('matter', 'made of', ['brass', 'stainless', 'nylon'])],
    title: (p) => `hose barb ${p.thread} × ${p.hose} mm, ${madeOf(p)[2]}`, of: (p) => madeOf(p)[0], make: (p) => (p.matter === 'nylon' ? 'mould' : 'machine'), alt: 'print', how: 'turned from bar with a hex and its barbs (or moulded, in nylon)', spec: (p) => `${p.thread} male; for ${p.hose} mm bore hose, clamped`,
    box: (p) => [Math.max(G(p, 'thread') * 1.3, n(p, 'hose') + 4), Math.max(G(p, 'thread') * 1.3, n(p, 'hose') + 4), n(p, 'hose') * 2 + 25], g: (p) => gOf(cyl(n(p, 'hose'), n(p, 'hose') * 2 + 10) * 0.5 + cyl(G(p, 'thread') * 1.3, 10) * 0.6, madeOf(p)[1]),
  },
  {
    id: 'pushfitting', name: 'push-in pneumatic fitting', path: 'Fluid/Pneumatics/Push-in fittings', says: 'a fitting that grips plastic air tube when it is pushed in, and lets it go when its collet is pressed', std: 'the tube sizes and threads sold',
    axes: [bare('type', 'type', ['straight', 'elbow', 'tee', 'Y', 'bulkhead', 'union']), bare('thread', 'thread', (p) => (p.type === 'straight' || p.type === 'elbow' ? ['M5', 'G1/8', 'G1/4', 'G3/8', 'G1/2'] : ['none'])), ax('tube', 'for tube', 'mm', [3, 4, 6, 8, 10, 12, 14, 16])],
    title: (p) => `push-in ${p.type} for ${p.tube} mm tube${p.thread === 'none' ? '' : `, ${p.thread}`}`, of: () => 'brass nickel pbt nbr stainless-304', make: 'assemble', how: 'a moulded PBT body, a nickel-plated brass thread, a stainless toothed collet and an NBR seal', spec: (p) => `${p.tube} mm OD tube; to about 10 bar (typical)`,
    box: (p) => [n(p, 'tube') * 2 + 4, n(p, 'tube') * 2 + 4, n(p, 'tube') * 2.5 + 15], g: (p) => n(p, 'tube') * 1.6 + 3,
  },
  {
    id: 'airtube', name: 'pneumatic tube', path: 'Fluid/Tubing and hose/Pneumatic tube', says: 'plastic tube for compressed air and push-in fittings', std: 'the outside × bore sizes sold, any length cut to the centimetre',
    axes: [bare('matter', 'made of', ['pu', 'nylon', 'pe', 'ptfe']), bare('size', 'outside × bore', ['4x2.5', '6x4', '8x5', '8x6', '10x6.5', '10x7', '12x8', '12x9', '16x11', '16x12']), bare('colour', 'colour', ['blue', 'black', 'clear', 'red']), unit('L', 'length', 'm', [1, 5, 10, 25, 50, 100], [0.01, 100, 0.01])],
    title: (p) => `${madeOf(p)[2]} air tube ${String(p.size).replace('x', ' × ')} mm, ${p.colour}, ${p.L} m`, of: (p) => madeOf(p)[0], make: 'extrude', how: 'extruded to size and cooled in a calibrating bath',
    spec: (p) => { const [D, d] = String(p.size).split('x').map(Number) as [number, number], S = ({ pu: 9, nylon: 22, pe: 8, ptfe: 10 } as Record<string, number>)[s(p, 'matter')]!; return `bursts at about ${((2 * ((D - d) / 2) * S) / D * 10).toFixed(0)} bar by Barlow (P = 2tS/D, S about ${S} MPa at 20 °C, typical); work it at a third of that`; },
    box: (p) => { const D = Number(String(p.size).split('x')[0]); return [D, D, Math.min(n(p, 'L') * 1000, 400)]; }, g: (p) => { const [D, d] = String(p.size).split('x').map(Number) as [number, number]; return gOf(ring(D, d, n(p, 'L') * 1000), madeOf(p)[1]); },
  },
  {
    id: 'softhose', name: 'flexible hose', path: 'Fluid/Tubing and hose/Hose', says: 'soft hose for water, coolant, air or fuel', std: 'the bores and walls sold, any length cut to the centimetre',
    axes: [bare('matter', 'made of', ['silicone', 'pvc', 'epdm', 'nbr']), ax('d', 'bore', 'mm', [2, 3, 4, 5, 6, 8, 10, 12, 13, 16, 19, 25, 32, 38, 50]), ax('t', 'wall', 'mm', (p) => [1, 1.5, 2, 3, 4, 5].filter((t) => t >= n(p, 'd') / 16 && t <= Math.max(1.5, n(p, 'd') / 3))), unit('L', 'length', 'm', [1, 5, 10, 25], [0.01, 100, 0.01])],
    title: (p) => `${madeOf(p)[2]} hose ${p.d} mm bore, ${p.t} mm wall, ${p.L} m`, of: (p) => madeOf(p)[0], make: 'extrude', how: (p) => (p.matter === 'silicone' ? 'silicone extruded and cured in an oven' : p.matter === 'pvc' ? 'clear PVC extruded' : 'rubber extruded and vulcanised'), spec: (p) => `${p.d} mm bore, ${n(p, 'd') + 2 * n(p, 't')} mm outside; ${p.matter === 'silicone' ? '−60 to 200 °C' : p.matter === 'nbr' ? 'oil and fuel' : p.matter === 'epdm' ? 'water, coolant and weather' : 'water and air, to about 60 °C'}`,
    box: (p) => [n(p, 'd') + 2 * n(p, 't'), n(p, 'd') + 2 * n(p, 't'), Math.min(n(p, 'L') * 1000, 400)], g: (p) => gOf(ring(n(p, 'd') + 2 * n(p, 't'), n(p, 'd'), n(p, 'L') * 1000), madeOf(p)[1]),
  },
  {
    id: 'hoseclamp', name: 'worm-drive hose clamp', path: 'Fluid/Fittings/Hose clamps', says: 'a slotted band tightened round a hose by a worm screw', std: 'DIN 3017 ranges; W1 zinc steel, W2 stainless band, W4 all stainless',
    axes: [bare('range', 'clamping range', CLAMP), bare('grade', 'grade', ['W1', 'W2', 'W4'])],
    title: (p) => `hose clamp ${String(p.range).replace('-', '–')} mm, ${p.grade}`, of: (p) => (p.grade === 'W1' ? 'steel-low zinc' : p.grade === 'W2' ? 'stainless-304 steel-low zinc' : 'stainless-304'), make: 'stamp', how: 'a band stamped with slots, rolled, its worm screw in a housing riveted on',
    spec: (p) => { const hi = Number(String(p.range).split('-')[1]); return `${String(p.range).replace('-', '–')} mm; band ${hi <= 16 ? 9 : 12} mm (DIN 3017)`; }, box: (p) => { const hi = Number(String(p.range).split('-')[1]); return [hi + 12, hi + 4, hi <= 16 ? 9 : 12]; }, g: (p) => { const hi = Number(String(p.range).split('-')[1]); return gOf(Math.PI * hi * (hi <= 16 ? 9 : 12) * 0.6, 7.9) + 3; },
  },
  {
    id: 'ballvalve', name: 'ball valve', path: 'Fluid/Valves/Ball valves', says: 'a valve that opens and shuts in a quarter turn: a bored ball turned across the flow', std: 'ISO 228-1 threads, two-way and three-way',
    axes: [bare('size', 'thread', Object.keys(BSP)), bare('matter', 'body', ['brass', 'stainless']), bare('ports', 'ports', ['2way', '3wayL', '3wayT']), bare('handle', 'handle', ['lever', 'butterfly'])],
    title: (p) => `${p.size} ${p.ports === '2way' ? '' : `${String(p.ports).replace('3way', '3-way ')}-port `}ball valve, ${madeOf(p)[2]}, ${p.handle} handle`, of: (p) => `${madeOf(p)[0]} ${madeOf(p)[0]} ptfe*2 steel-low`, make: 'assemble', how: 'a forged body, a chromed (or stainless) ball on PTFE seats, a stem with its handle',
    spec: (p) => `${p.size}; full bore; about ${G(p) < 30 ? 40 : 25} bar (typical); a quarter turn shut`, box: (p) => [G(p) * 2.6, G(p) * 2.2, G(p) * 2.6], g: (p) => gOf(G(p) ** 3 * 4.5, madeOf(p)[1]),
  },
  {
    id: 'checkvalve', name: 'check valve', path: 'Fluid/Valves/Check valves', says: 'a one-way valve: flow pushes it open, back-flow shuts it', std: 'ISO 228-1 threads',
    axes: [bare('size', 'thread', Object.keys(BSP)), bare('matter', 'body', ['brass', 'stainless']), bare('style', 'style', ['spring', 'swing'])],
    title: (p) => `${p.size} ${p.style} check valve, ${madeOf(p)[2]}`, of: (p) => `${madeOf(p)[0]} ${p.style === 'spring' ? 'steel-spring nbr' : 'nbr'}`, make: 'assemble', how: (p) => (p.style === 'spring' ? 'a poppet held on its seat by a light spring' : 'a hinged flap that the flow swings open'), spec: (p) => `${p.size}; opens at about ${p.style === 'spring' ? '0.02–0.05' : '0.01'} bar (typical)`,
    box: (p) => [G(p) * 1.6, G(p) * 1.6, G(p) * 3], g: (p) => gOf(G(p) ** 3 * 3, madeOf(p)[1]),
  },
  {
    id: 'needlevalve', name: 'needle valve', path: 'Fluid/Valves/Needle valves', says: 'a fine-pointed stem screwed into a seat, to set a small flow exactly', std: 'ISO 228-1 threads, small sizes',
    axes: [bare('size', 'thread', ['G1/8', 'G1/4', 'G3/8', 'G1/2']), bare('matter', 'body', ['brass', 'stainless'])],
    title: (p) => `${p.size} needle valve, ${madeOf(p)[2]}`, of: (p) => `${madeOf(p)[0]} ptfe`, make: 'machine', how: 'a machined body and a tapered needle on a fine thread, packed with PTFE', spec: (p) => `${p.size}; many turns from shut to open, for fine control`, box: (p) => [G(p) * 1.8, G(p) * 1.8, G(p) * 5], g: (p) => gOf(G(p) ** 3 * 3.5, madeOf(p)[1]),
  },
  {
    id: 'solenoidvalve', name: 'solenoid valve', path: 'Fluid/Valves/Solenoid valves', says: 'a valve opened and shut by an electromagnet pulling a plunger', std: 'ISO 228-1 threads; the coil voltages sold',
    axes: [bare('size', 'thread', ['G1/8', 'G1/4', 'G3/8', 'G1/2', 'G3/4', 'G1']), bare('coil', 'coil', ['12VDC', '24VDC', '230VAC']), bare('state', 'unpowered', ['NC', 'NO']), bare('matter', 'body', ['brass', 'stainless'])],
    title: (p) => `${p.size} solenoid valve, ${p.state === 'NC' ? 'normally closed' : 'normally open'}, ${p.coil}, ${madeOf(p)[2]}`, of: (p) => `${madeOf(p)[0]} magnet-wire steel-low stainless-304 nbr bobbin`, make: 'assemble', how: 'a coil round a stainless tube, a steel plunger in it seating a rubber disc (for big sizes, piloting a diaphragm)',
    spec: (p) => `${p.size}; coil ${p.coil}, about ${p.coil === '230VAC' ? '8 VA' : '10 W'} (typical); ${G(p) > 15 ? 'pilot-operated: needs about 0.3 bar across it to work' : 'direct-acting: works from 0 bar'}`, box: (p) => [G(p) * 2 + 20, 40, G(p) * 2 + 55], g: (p) => gOf(G(p) ** 3 * 3, madeOf(p)[1]) + 120,
  },
  {
    id: 'aircylinder', name: 'pneumatic cylinder', path: 'Fluid/Pneumatics/Cylinders', says: 'a piston in a tube pushed out and back by compressed air', std: 'ISO 6432 round cylinders (8–25 mm) and ISO 15552 profile cylinders (32–125 mm); any stroke 1–500 mm made to order',
    axes: [ax('bore', 'bore', 'mm', [8, 10, 12, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125]), bare('action', 'action', ['double', 'single']), unit('s', 'stroke', 'mm', (p) => pref(10, n(p, 'bore') <= 25 ? 200 : 300), [1, 500, 1])],
    title: (p) => `${p.action}-acting cylinder ${p.bore} mm bore × ${p.s} mm stroke`, of: (p) => `${n(p, 'bore') <= 25 ? 'stainless-304' : 'al-6063'} steel-alloy nbr pu al-6061*2${p.action === 'single' ? ' steel-spring' : ''}`, make: 'assemble', how: (p) => `a ${n(p, 'bore') <= 25 ? 'stainless tube rolled shut on its end caps' : 'hard-anodised aluminium profile with tie screws'}, a piston with lip seals, a chromed rod${p.action === 'single' ? ', a spring to return it' : ''}`,
    spec: (p) => { const A = (Math.PI * n(p, 'bore') ** 2) / 4, r = ROD[n(p, 'bore')]!, a = A - (Math.PI * r * r) / 4; return `at 6 bar: ${((0.6 * A)).toFixed(0)} N out (F = p × πD²/4), ${(0.6 * a).toFixed(0)} N back; rod ${r} mm (${n(p, 'bore') <= 25 ? 'ISO 6432' : 'ISO 15552'})`; },
    box: (p) => [n(p, 'bore') * 1.25 + 4, n(p, 'bore') * 1.25 + 4, n(p, 's') * 2 + n(p, 'bore') * 2 + 40], g: (p) => gOf(ring(n(p, 'bore') * 1.25 + 4, n(p, 'bore'), n(p, 's') + n(p, 'bore') + 20), n(p, 'bore') <= 25 ? 8 : 2.7) + gOf(cyl(ROD[n(p, 'bore')]!, n(p, 's') + 30), 7.85) + n(p, 'bore') * 4,
  },
  {
    id: 'coppertube', name: 'copper tube', path: 'Fluid/Tubing and hose/Copper tube', says: 'drawn copper tube for water, gas and heating, to join with fittings or solder', std: 'EN 1057 outsides and walls; any length cut to the centimetre',
    axes: [ax('od', 'outside', 'mm', Object.keys(CU).map(Number)), ax('t', 'wall', 'mm', (p) => CU[n(p, 'od')]!), unit('L', 'length', 'm', [1, 2, 3, 5], [0.01, 6, 0.01])],
    title: (p) => `copper tube ${p.od} × ${p.t} mm, ${p.L} m`, of: () => 'copper', make: 'draw', how: 'phosphorus-deoxidised copper drawn over a mandrel to size, half-hard', spec: (p) => `${p.od} × ${p.t} mm (EN 1057); bore ${(n(p, 'od') - 2 * n(p, 't')).toFixed(1)} mm`,
    box: (p) => [n(p, 'od'), n(p, 'od'), Math.min(n(p, 'L') * 1000, 600)], g: (p) => gOf(ring(n(p, 'od'), n(p, 'od') - 2 * n(p, 't'), n(p, 'L') * 1000), 8.94),
  },
  {
    id: 'shaftseal', name: 'rotary shaft seal', path: 'Mechanical/Seals/Shaft seals', says: 'a rubber lip, held on a turning shaft by a garter spring, in a steel-cased ring pressed into the bore', std: 'DIN 3760 sizes; type A (one lip) and AS (with a dust lip)',
    axes: [bare('size', 'shaft × bore × width', LIP), bare('type', 'type', ['A', 'AS']), bare('matter', 'rubber', ['nbr', 'fkm'])],
    title: (p) => `shaft seal ${String(p.size).replace(/x/g, ' × ')}, ${p.type}, ${p.matter.toString().toUpperCase()}`, of: (p) => `${madeOf(p)[0]} steel-low steel-spring`, make: 'mould', how: 'rubber moulded onto a stamped steel case, its lip trimmed sharp, a garter spring fitted',
    spec: (p) => `${p.size} mm (DIN 3760 ${p.type}); ${p.matter === 'nbr' ? '−40 to 100 °C' : '−20 to 200 °C'}`, box: (p) => { const [, D, b] = String(p.size).split('x').map(Number) as [number, number, number]; return [D, D, b]; }, g: (p) => { const [d, D, b] = String(p.size).split('x').map(Number) as [number, number, number]; return gOf(ring(D, d, b) * 0.5, 4); },
  },
  {
    id: 'oringcord', name: 'O-ring cord', path: 'Mechanical/Seals/O-rings', says: 'round rubber cord, cut and joined into an O-ring of any size', std: 'the sections sold, any length cut to the centimetre',
    axes: [ax('cs', 'section', 'mm', [1.5, 2, 2.5, 3, 3.5, 4, 5, 5.33, 5.7, 6, 7, 8, 10, 12]), bare('matter', 'rubber', ['nbr', 'epdm', 'fkm', 'silicone']), unit('L', 'length', 'm', [1, 5, 10], [0.01, 100, 0.01])],
    title: (p) => `O-ring cord ${p.cs} mm, ${madeOf(p)[2]}, ${p.L} m`, of: (p) => madeOf(p)[0], make: 'extrude', how: 'rubber extruded round and cured', spec: (p) => `${p.cs} mm; joined with cyanoacrylate (or vulcanised) into a ring of length π × (inside + ${p.cs})`,
    box: (p) => [n(p, 'cs'), n(p, 'cs'), Math.min(n(p, 'L') * 1000, 400)], g: (p) => gOf(cyl(n(p, 'cs'), n(p, 'L') * 1000), madeOf(p)[1]),
  },
];
