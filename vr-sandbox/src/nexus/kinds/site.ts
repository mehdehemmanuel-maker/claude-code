// What a building site, a workshop and a lab buy: boards, bricks, blocks and insulation; sockets, switches, bulbs and
// cable; oils and greases; welding wire, rods and gas; measuring tools, clamps and hammers; beakers; shackles and wire
// rope. Numbers from EN 520 (plasterboard), EN 771-1 and DIN 105 (bricks), ASTM C90 (blocks), BS 1363, CEE 7/3, NEMA
// WD 6 and AS/NZS 3112 (sockets), EU 1194/2012 (lamp equivalence), BS 7671 and NEC 310.16 (cable ratings), ISO 3448
// (oil grades), NLGI (grease), AWS A5 and EN ISO 544 (welding), MID 2014/32/EU (tape accuracy), ISO 3819 and 3585 (lab
// glass), EN 13889 (shackles), EN 12385-4 (wire rope); and from the laws in each (R = t/λ, ½mv², pV = ZnRT).

import { ax, bare, gOf, unit, type KindDef, type P } from './core';

const n = (p: P, k: string) => Number(p[k]);
const s = (p: P, k: string) => String(p[k]);
const r1 = (x: number) => +x.toFixed(1);
const dims = (x: string) => x.split('x').map(Number) as [number, number, number];

/** EN 520 plasterboard: density (g/cm³) by type, typical. */
const BOARD: Record<string, [number, string]> = { A: [0.68, 'standard'], H: [0.72, 'water-resistant core: water absorption limited (H1 ≤ 5 %, H2 ≤ 10 %)'], F: [0.8, 'glass fibre in its core holds it together in a fire'] };
/** Brick formats (mm) and their standards. */
const BRICK: Record<string, [string, string]> = { UK: ['215x102.5x65', 'EN 771-1, UK work size'], 'US-modular': ['194x92x57', 'ASTM C216, modular'], 'DIN-NF': ['240x115x71', 'DIN 105, Normalformat'] };
/** Gross density (g/cm³) and strength, by brick. */
const BRICKTYPE: Record<string, [number, string]> = { solid: [1.9, 'about 20–50 N/mm² (typical)'], perforated: [1.5, 'about 20–40 N/mm² on its gross area (typical)'], 'engineering-A': [2.2, 'at least 125 N/mm², water absorption ≤ 4.5 %'], 'engineering-B': [2.1, 'at least 75 N/mm², water absorption ≤ 7 %'] };
/** Blocks: sizes (mm) by system; gross density (g/cm³) and strength by type. */
const BLOCKTYPE: Record<string, [string[], number, string]> = { dense: [['440x215x100', '440x215x140', '440x215x215'], 2.0, 'typically 7.3 N/mm²'], aircrete: [['440x215x100', '440x215x140', '440x215x215'], 0.6, 'typically 3.6 N/mm²; light, sawn to shape'], 'CMU-hollow': [['390x190x90', '390x190x140', '390x190x190', '390x190x240', '390x190x290'], 1.2, 'at least 13.8 MPa on its net area (ASTM C90)'] };
/** Insulation boards: λ (W/m·K, declared, typical), thicknesses (mm), board (mm), density (kg/m³), what it is of. */
const INSUL: Record<string, [number, number[], [number, number], number, string]> = {
  PIR: [0.022, [25, 50, 75, 100, 120, 150], [2400, 1200], 32, 'pu al-foil'], EPS: [0.036, [25, 50, 75, 100, 150], [1200, 600], 15, 'ps'], XPS: [0.034, [30, 50, 75, 100], [1250, 600], 33, 'ps'], mineralwool: [0.035, [50, 75, 100, 140], [1200, 600], 45, 'fibreglass phenolic'],
};
/** Sockets: rating, plate (mm) for 1 and 2 gangs, and whether they come switched. */
const SOCKET: Record<string, [string, [number, number], [number, number], boolean]> = { BS1363: ['13 A 250 V, fused plugs (BS 1363)', [86, 86], [146, 86], true], Schuko: ['16 A 250 V, earth by side clips (CEE 7/3)', [80, 80], [151, 80], false], 'NEMA5-15': ['15 A 125 V, earth pin (NEMA WD 6)', [70, 115], [115, 115], false], 'AS3112': ['10 A 250 V (AS/NZS 3112)', [116, 73], [116, 73], true] };
/** Non-directional lamp equivalence (EU 1194/2012): lumens for the incandescent watts they replace. */
const EQUIV: Record<number, number> = { 136: 15, 249: 25, 470: 40, 806: 60, 1055: 75, 1521: 100, 2452: 150 };
const LAMP: Record<string, [number[], [number, number, number]]> = { E27: [[470, 806, 1055, 1521, 2452], [60, 60, 108]], B22: [[470, 806, 1055, 1521], [60, 60, 108]], E14: [[249, 470, 806], [35, 35, 98]], GU10: [[230, 345, 450], [50, 50, 55]], 'GU5.3': [[230, 345, 450], [50, 50, 46]] };
/** Twin and earth (BS 6004 6242Y): earth size and current clipped direct (BS 7671 Table 4D5, method C), by conductor. */
const TE: Record<number, [number, number]> = { 1: [1, 16], 1.5: [1, 20], 2.5: [1.5, 27], 4: [1.5, 37], 6: [2.5, 47], 10: [4, 64] };
/** NM-B (UL 719): mm², ground AWG, amps at 60 °C (NEC 310.16), by AWG. */
const NM: Record<number, [number, number, number]> = { 14: [2.08, 14, 15], 12: [3.31, 12, 20], 10: [5.26, 10, 30], 8: [8.37, 10, 40], 6: [13.3, 10, 55] };
/** ISO 3448 viscosity grades. */
const VG = [2, 3, 5, 7, 10, 15, 22, 32, 46, 68, 100, 150, 220, 320, 460, 680, 1000, 1500];
/** NLGI grades: worked penetration (0.1 mm, ASTM D217). */
const NLGI: Record<string, [number, number]> = { '000': [445, 475], '00': [400, 430], '0': [355, 385], '1': [310, 340], '2': [265, 295], '3': [220, 250], '4': [175, 205], '5': [130, 160], '6': [85, 115] };
/** MIG wire: AWS class, diameters, spools (kg), what it is of, the gas it runs in. */
const MIG: Record<string, [string, number[], number[], string, string]> = {
  'ER70S-6': ['AWS A5.18, for mild steel', [0.6, 0.8, 0.9, 1.0, 1.2], [1, 5, 15], 'steel-low copper', 'argon with 18 % CO₂, or CO₂'], 'ER308LSi': ['AWS A5.9, for 304 stainless', [0.8, 1.0], [1, 5, 15], 'stainless-304', 'argon with 2 % CO₂'],
  ER4043: ['AWS A5.10, aluminium with 5 % silicon', [0.8, 1.0, 1.2], [0.5, 2, 7], 'al-4043', 'pure argon'], ER5356: ['AWS A5.10, aluminium with 5 % magnesium', [0.8, 1.0, 1.2], [0.5, 2, 7], 'al-5356', 'pure argon'],
};
/** EN ISO 544 spools by the mass they carry: name, diameter × width (mm). */
const spool = (kg: number): [string, number, number] => (kg <= 1 ? ['S 100', 100, 45] : kg <= 5 ? ['S 200', 200, 55] : ['S 300', 300, 103]);
/** Stick electrodes: AWS class, what its flux is, diameters. */
const ROD: Record<string, [string, string, number[], string]> = { E6013: ['AWS A5.1, rutile: easy to strike, a smooth bead', 'steel-low rutile marble', [2.0, 2.5, 3.2, 4.0], 'mild steel'], E7018: ['AWS A5.1, basic low-hydrogen: tough, for structural work (keep it dry)', 'steel-low marble rutile', [2.5, 3.2, 4.0], 'mild and structural steel'], 'E308L-16': ['AWS A5.4, for 304 stainless', 'stainless-304 rutile marble', [2.5, 3.2, 4.0], '304 stainless'] };
/** Currents for a stick of a diameter (A, typical). */
const AMPS: Record<number, string> = { 2: '40–70', 2.5: '60–90', 3.2: '90–130', 4: '120–170' };
/** Gas cylinders: diameter × height (mm) and empty mass (kg), by water capacity, typical 200 bar steel. */
const CYL: Record<number, [number, number, number]> = { 10: [140, 930, 14], 20: [204, 950, 27], 50: [229, 1600, 58] };
const GAS: Record<string, [string, string]> = { argon: ['argon', 'TIG, and MIG of aluminium'], co2: ['co2', 'MIG of steel: cheap, deep, spattery'], 'Ar-18CO2': ['argon*4 co2', 'MIG of steel: smooth, little spatter'] };
/** Tape measures: blade widths by length (mm). MID class accuracy ±(a + bL) mm. */
const TAPE: Record<number, number[]> = { 2: [13, 16], 3: [13, 16, 19], 5: [19, 25], 8: [25, 27], 10: [25, 32] };
const TAPECLASS: Record<string, [number, number]> = { I: [0.1, 0.1], II: [0.3, 0.2] };
/** Clamps: openings sold, throat (mm), what each is of. */
const CLAMP: Record<string, [number[], (o: number) => number, string, (o: number) => number]> = {
  G: [[50, 75, 100, 150, 200, 250, 300], (o) => o * 0.6, 'cast-iron steel-low', (o) => 0.6 * o ** 1.5], F: [[100, 150, 200, 300, 500, 800, 1000], (o) => (o <= 300 ? 80 : 120), 'steel-low cast-iron wood', (o) => 300 + o * 2.5], quick: [[150, 300, 450, 600, 900], () => 90, 'nylon steel-low pu', (o) => 300 + o * 1.1],
};
/** Hammers: head masses sold (oz), handle (mm), what each is of. */
const HAMMER: Record<string, [number[], number, string]> = { claw: [[16, 20, 24], 330, 'steel-tool fibreglass rubber'], 'ball-pein': [[8, 12, 16, 24, 32], 320, 'steel-tool wood'], club: [[40, 48, 64], 270, 'steel-tool wood'], sledge: [[112, 160, 224], 900, 'steel-tool fibreglass'], mallet: [[16, 24, 32], 330, 'rubber wood'] };
/** ISO 3819 low-form beakers: diameter × height (mm), typical. */
const BEAKER: Record<number, [number, number]> = { 10: [26, 35], 25: [34, 50], 50: [42, 60], 100: [50, 70], 150: [60, 80], 250: [70, 95], 400: [80, 110], 600: [90, 125], 1000: [105, 145], 2000: [130, 185], 3000: [150, 210], 5000: [170, 270] };
/** EN 12385-4 wire rope: the factors K (breaking) and W' (kg per 100 m per mm²). */
const ROPE: Record<string, [number, number, string]> = { '6x19-FC': [0.33, 0.359, 'steel-spring zinc pp'], '6x36-IWRC': [0.356, 0.4, 'steel-spring zinc'] };

export const SITE: KindDef[] = [
  {
    id: 'plasterboard', name: 'plasterboard', path: 'Materials/Building/Boards', says: 'a gypsum core between paper faces: the walls and ceilings of a building', std: 'EN 520 types and thicknesses; the sheet sizes sold; densities typical',
    axes: [bare('type', 'type', Object.keys(BOARD)), ax('t', 'thickness', 'mm', (p) => (p.type === 'F' ? [12.5, 15] : [9.5, 12.5, 15])), bare('sheet', 'sheet', (p) => (p.type === 'A' && n(p, 't') <= 12.5 ? ['2400x1200', '2700x1200', '3000x1200', '1800x900'] : ['2400x1200', '2700x1200', '3000x1200']))],
    title: (p) => `${p.t} mm plasterboard type ${p.type}, ${String(p.sheet).replace('x', ' × ')} mm`, of: (p) => `gypsum paper${p.type === 'F' ? ' fibreglass' : ''}`, make: 'cast', how: 'gypsum slurry poured between two papers on a line, set, cut and dried',
    spec: (p) => { const [L, W] = dims(s(p, 'sheet')), kgm2 = BOARD[s(p, 'type')]![0] * n(p, 't'); return `type ${p.type} (EN 520): ${BOARD[s(p, 'type')]![1]}; about ${kgm2.toFixed(1)} kg/m², ${((kgm2 * L * W) / 1e6).toFixed(1)} kg a sheet (typical)`; },
    box: (p) => { const [L, W] = dims(s(p, 'sheet')); return [L, W, n(p, 't')]; }, g: (p) => { const [L, W] = dims(s(p, 'sheet')); return gOf(L * W * n(p, 't'), BOARD[s(p, 'type')]![0]); }, look: 'sheet',
  },
  {
    id: 'claybrick', name: 'clay brick', path: 'Materials/Building/Masonry', says: 'a fired clay brick in its country\'s format', std: 'EN 771-1 (UK), ASTM C216 and DIN 105 formats; engineering classes by strength and water absorption; densities typical',
    axes: [bare('format', 'format', Object.keys(BRICK)), bare('type', 'type', (p) => (p.format === 'UK' ? Object.keys(BRICKTYPE) : ['solid', 'perforated']))],
    title: (p) => `${p.type.toString().replace('-', ' ')} clay brick, ${s(p, 'format').replace('-', ' ')} (${BRICK[s(p, 'format')]![0].replace(/x/g, ' × ')} mm)`, of: () => 'brick', make: 'cast', how: 'clay extruded or pressed to shape, dried and fired in a kiln near 1000 °C',
    spec: (p) => { const [L, , H] = dims(BRICK[s(p, 'format')]![0]); return `${BRICK[s(p, 'format')]![1]}: ${BRICKTYPE[s(p, 'type')]![1]}; with 10 mm joints, ${(1e6 / ((L + 10) * (H + 10))).toFixed(0)} a square metre of half-brick wall`; },
    box: (p) => dims(BRICK[s(p, 'format')]![0]), g: (p) => { const [a, b, c] = dims(BRICK[s(p, 'format')]![0]); return gOf(a * b * c, BRICKTYPE[s(p, 'type')]![0]); }, look: 'box',
  },
  {
    id: 'concreteblock', name: 'concrete block', path: 'Materials/Building/Masonry', says: 'a concrete building block: dense, aerated, or a hollow masonry unit', std: 'UK 440 × 215 blocks and ASTM C90 hollow units (CMU) in the widths sold; densities typical',
    axes: [bare('type', 'type', Object.keys(BLOCKTYPE)), bare('size', 'size', (p) => BLOCKTYPE[s(p, 'type')]![0])],
    title: (p) => `${p.type === 'CMU-hollow' ? 'hollow concrete masonry unit' : `${p.type} concrete block`} ${String(p.size).replace(/x/g, ' × ')} mm`, of: () => 'concrete', make: 'cast', how: (p) => (p.type === 'aircrete' ? 'a lime, cement and sand slurry aerated with aluminium powder, cured in steam' : 'a stiff concrete mix vibrated into moulds and cured'),
    spec: (p) => { const [L, H, W] = dims(s(p, 'size')); return `${BLOCKTYPE[s(p, 'type')]![2]}; with 10 mm joints, ${(1e6 / ((L + 10) * (H + 10))).toFixed(1)} a square metre; about ${((L * H * W * BLOCKTYPE[s(p, 'type')]![1]) / 1e6).toFixed(1)} kg each (typical)`; },
    box: (p) => { const [L, H, W] = dims(s(p, 'size')); return [L, H, W]; }, g: (p) => { const [L, H, W] = dims(s(p, 'size')); return gOf(L * H * W, BLOCKTYPE[s(p, 'type')]![1]); }, look: 'box',
  },
  {
    id: 'insulation', name: 'insulation board', path: 'Materials/Building/Insulation', says: 'a board that slows heat through a wall, roof or floor: its thickness over its conductivity is its resistance', std: 'the boards and thicknesses sold; λ declared values typical',
    axes: [bare('type', 'type', Object.keys(INSUL)), ax('t', 'thickness', 'mm', (p) => INSUL[s(p, 'type')]![1])],
    title: (p) => `${p.t} mm ${p.type === 'mineralwool' ? 'mineral wool slab' : `${p.type} board`}`, of: (p) => INSUL[s(p, 'type')]![4], make: (p) => (p.type === 'mineralwool' ? 'blow' : 'mould'), how: (p) => ({ PIR: 'polyisocyanurate foamed between foil facings', EPS: 'polystyrene beads expanded with steam and moulded into blocks, then cut', XPS: 'polystyrene extruded as a closed-cell foam', mineralwool: 'molten glass or stone spun into fibres, bound with resin and pressed' } as Record<string, string>)[s(p, 'type')]!,
    spec: (p) => { const lam = INSUL[s(p, 'type')]![0], R = n(p, 't') / 1000 / lam; return `λ = ${lam} W/m·K (declared, typical): R = t / λ = ${R.toFixed(2)} m²·K/W; alone, U = 1/R = ${(1 / R).toFixed(2)} W/m²·K`; },
    box: (p) => [...INSUL[s(p, 'type')]![2], n(p, 't')] as [number, number, number], g: (p) => { const [L, W] = INSUL[s(p, 'type')]![2]; return ((L * W * n(p, 't')) / 1e9) * INSUL[s(p, 'type')]![3] * 1000; }, look: 'sheet',
  },
  {
    id: 'socketoutlet', name: 'wall socket', path: 'Electrical/Wiring accessories/Sockets', says: 'a mains socket outlet on its wall plate, by its country\'s standard', std: 'BS 1363, CEE 7/3, NEMA WD 6 and AS/NZS 3112 ratings; plate sizes typical',
    axes: [bare('std', 'standard', Object.keys(SOCKET)), unit('gang', 'gangs', 'G', [1, 2]), bare('sw', 'switch', (p) => (SOCKET[s(p, 'std')]![3] ? ['switched', 'unswitched'] : ['unswitched']))],
    title: (p) => `${p.gang}-gang ${p.sw} ${s(p, 'std').replace(/(\d)/, ' $1')} socket`, of: (p) => `pc brass*${p.gang} copper steel-spring steel-low`, make: 'assemble', how: 'brass contacts on springs behind a moulded plate with shutters, screw terminals behind',
    spec: (p) => `${SOCKET[s(p, 'std')]![0]}; ${p.sw === 'switched' ? 'a switch on each' : 'no switch'}`, box: (p) => [...SOCKET[s(p, 'std')]![n(p, 'gang') === 1 ? 1 : 2], 35] as [number, number, number], g: (p) => 70 * n(p, 'gang'), look: 'case',
  },
  {
    id: 'lightswitch', name: 'light switch', path: 'Electrical/Wiring accessories/Switches', says: 'a wall switch for lights: one-way, two-way (for stairs), or intermediate', std: 'EN 60669-1, 10 AX; plates typical',
    axes: [bare('way', 'way', ['1-way', '2-way', 'intermediate']), unit('gang', 'gangs', 'G', [1, 2, 3, 4])],
    title: (p) => `${p.gang}-gang ${p.way} light switch`, of: (p) => `pc brass*${p.gang} copper silver steel-spring`, make: 'assemble', how: 'a rocker on a snap mechanism with silver contacts, behind a moulded plate',
    spec: (p) => `10 AX, 250 V (EN 60669-1); ${p.way === '1-way' ? 'on and off from here' : p.way === '2-way' ? 'with another 2-way, a light worked from two places' : 'between two 2-way switches, a third place'}`, box: (p) => (n(p, 'gang') <= 2 ? [86, 86, 35] : [146, 86, 35]), g: (p) => 40 + 15 * n(p, 'gang'), look: 'case',
  },
  {
    id: 'ledbulb', name: 'LED light bulb', path: 'Electrical/Lighting/Bulbs', says: 'an LED lamp to fit a light fitting by its base', std: 'the bases and lumens sold; incandescent equivalents from EU 1194/2012; about 100 lm/W (typical)',
    axes: [bare('base', 'base', Object.keys(LAMP)), unit('lm', 'light', 'lm', (p) => LAMP[s(p, 'base')]![0]), unit('K', 'colour', 'K', [2700, 3000, 4000, 6500])],
    title: (p) => `${p.base} LED bulb, ${p.lm} lm, ${p.K} K`, of: (p) => `pc al-6063 gan yag-phosphor fr4 smd-passives ${p.base === 'GU10' ? 'alumina' : 'brass'}`, make: 'assemble', how: 'LEDs on an aluminium-backed board, a small driver in the base, under a diffusing cover',
    spec: (p) => { const lm = n(p, 'lm'), eq = EQUIV[lm]; return `about ${(lm / 100).toFixed(1)} W at about 100 lm/W (typical)${eq ? `; like a ${eq} W incandescent (EU 1194/2012)` : ''}; ${n(p, 'K') <= 3000 ? 'warm white' : n(p, 'K') <= 4000 ? 'neutral white' : 'daylight'}${p.base === 'GU5.3' ? '; 12 V' : ''}`; },
    box: (p) => (n(p, 'lm') > 1600 ? [67, 67, 120] : LAMP[s(p, 'base')]![1]), g: (p) => 25 + n(p, 'lm') / 25, look: 'dome',
  },
  {
    id: 'twinearth', name: 'twin and earth cable', path: 'Electrical/Wiring and connectors/Building cable', says: 'flat cable of two insulated cores and a bare earth: the fixed wiring of British homes', std: 'BS 6004 (6242Y) sizes; current clipped direct from BS 7671 Table 4D5; any length to the metre',
    axes: [unit('A', 'conductor', 'mm²', Object.keys(TE).map(Number)), unit('L', 'length', 'm', [10, 25, 50, 100], [1, 250, 1])],
    title: (p) => `${p.A} mm² twin and earth (6242Y), ${p.L} m`, of: () => 'copper*3 pvc', make: 'extrude', how: 'two copper cores in PVC with a bare earth between, in a flat PVC sheath',
    spec: (p) => { const [E, I] = TE[n(p, 'A')]!; return `${p.A} mm² cores, ${E} mm² earth; carries ${I} A clipped direct (BS 7671 Table 4D5, method C)`; },
    box: (p) => (n(p, 'L') >= 25 ? [300, 300, 100] : [200, 200, 60]), g: (p) => { const A = n(p, 'A'); return n(p, 'L') * ((2 * A + TE[A]![0]) * 8.96 + A * 12 + 35); }, look: (p) => `coil w${r1(2 * Math.sqrt(n(p, 'A')) + 5)}`,
  },
  {
    id: 'nmcable', name: 'NM-B cable', path: 'Electrical/Wiring and connectors/Building cable', says: 'non-metallic sheathed cable, two conductors and a ground: the house wiring of North America', std: 'UL 719 sizes; ampacity at 60 °C from NEC 310.16; any length to the metre',
    axes: [unit('awg', 'size', 'AWG', Object.keys(NM).map(Number)), unit('L', 'length', 'm', [7.6, 15.2, 30.5, 76.2], [1, 250, 1])],
    title: (p) => `${p.awg}/2 NM-B with ground, ${p.L} m`, of: () => 'copper*3 pvc nylon paper', make: 'extrude', how: 'two copper conductors in PVC with a nylon skin and a bare ground, wrapped in paper, in a PVC sheath',
    spec: (p) => { const [mm2, gnd, I] = NM[n(p, 'awg')]!; return `${p.awg} AWG (${mm2} mm²), ${gnd} AWG ground; ${I} A at 60 °C (NEC 310.16)`; },
    box: (p) => (n(p, 'L') >= 25 ? [300, 300, 100] : [200, 200, 60]), g: (p) => { const [mm2] = NM[n(p, 'awg')]!; return n(p, 'L') * (3 * mm2 * 8.96 + mm2 * 12 + 40); }, look: (p) => `coil w${r1(2 * Math.sqrt(NM[n(p, 'awg')]![0]) + 6)}`,
  },
  {
    id: 'oil', name: 'lubricating oil', path: 'Materials/Lubricants/Oils', says: 'mineral oil by its ISO viscosity grade: thin for spindles, thick for gears', std: 'ISO 3448 grades; the cans sold',
    axes: [ax('VG', 'grade', '', VG), unit('L', 'volume', 'L', [1, 5, 20])],
    title: (p) => `ISO VG ${p.VG} oil, ${p.L} l`, of: () => 'oil pe', make: 'chemistry', how: 'refined base oil with its additives, in an HDPE can',
    spec: (p) => { const v = n(p, 'VG'); return `${(v * 0.9).toFixed(v < 10 ? 2 : 1)}–${(v * 1.1).toFixed(v < 10 ? 2 : 1)} mm²/s at 40 °C (ISO 3448, VG ± 10 %): ${v <= 10 ? 'spindles and light oiling' : v <= 68 ? 'hydraulics and circulating systems' : v <= 220 ? 'gears and slideways' : 'heavy gears'}`; },
    box: (p) => ({ 1: [100, 60, 200], 5: [190, 130, 300], 20: [300, 250, 380] } as Record<number, [number, number, number]>)[n(p, 'L')]!, g: (p) => n(p, 'L') * 870 + 60 * n(p, 'L') ** 0.7, look: 'can',
  },
  {
    id: 'grease', name: 'grease', path: 'Materials/Lubricants/Greases', says: 'oil held in a thickener: it stays where it is put', std: 'NLGI consistency grades (worked penetration, ASTM D217); the packs sold',
    axes: [ax('NLGI', 'grade', '', Object.keys(NLGI)), bare('thick', 'thickener', ['lithium', 'lithium-complex']), bare('pack', 'pack', ['400g', '1kg', '18kg'])],
    title: (p) => `NLGI ${p.NLGI} ${s(p, 'thick').replace('-', ' ')} grease, ${s(p, 'pack').replace(/(\d)([a-z])/, '$1 $2')}`, of: () => 'grease pe', make: 'chemistry', how: 'mineral oil cooked with lithium soap (or a lithium complex), milled smooth',
    spec: (p) => { const [lo, hi] = NLGI[s(p, 'NLGI')]!; return `NLGI ${p.NLGI}: a cone sinks ${lo / 10}–${hi / 10} mm in it, worked (ASTM D217); ${p.thick === 'lithium' ? 'to about 120 °C' : 'to about 150 °C'} (typical)${p.NLGI === '2' ? '; the usual bearing grease' : ''}`; },
    box: (p) => ({ '400g': [55, 55, 220], '1kg': [120, 120, 100], '18kg': [300, 300, 340] } as Record<string, [number, number, number]>)[s(p, 'pack')]!, g: (p) => ({ '400g': 450, '1kg': 1080, '18kg': 18800 } as Record<string, number>)[s(p, 'pack')]!, look: 'can',
  },
  {
    id: 'migwire', name: 'MIG welding wire', path: 'Tools/Welding/Consumables', says: 'solid filler wire on a spool, fed through a MIG torch', std: 'AWS A5.18, A5.9 and A5.10 classes; EN ISO 544 spools',
    axes: [bare('class', 'class', Object.keys(MIG)), ax('d', 'diameter', 'mm', (p) => MIG[s(p, 'class')]![1]), unit('kg', 'spool', 'kg', (p) => MIG[s(p, 'class')]![2])],
    title: (p) => `${p.class} MIG wire ${p.d} mm, ${p.kg} kg spool`, of: (p) => `${MIG[s(p, 'class')]![3]} ${n(p, 'kg') > 5 ? 'steel-low' : 'abs'}`, make: 'draw', how: 'rod drawn down to wire, cleaned (copper-coated for steel), layer-wound on its spool',
    spec: (p) => { const [sp, D, W] = spool(n(p, 'kg')); return `${MIG[s(p, 'class')]![0]}; run in ${MIG[s(p, 'class')]![4]}; spool ${sp} (${D} × ${W} mm, EN ISO 544)`; },
    box: (p) => { const [, D, W] = spool(n(p, 'kg')); return [D, D, W]; }, g: (p) => n(p, 'kg') * 1000 + (n(p, 'kg') > 5 ? 1500 : 150), look: 'ring',
  },
  {
    id: 'electrode', name: 'welding electrode', path: 'Tools/Welding/Consumables', says: 'a flux-coated rod for stick (MMA) welding', std: 'AWS A5.1 and A5.4 classes; diameters, lengths and currents typical',
    axes: [bare('class', 'class', Object.keys(ROD)), ax('d', 'diameter', 'mm', (p) => ROD[s(p, 'class')]![2]), unit('kg', 'pack', 'kg', [1, 5])],
    title: (p) => `${p.class} electrode ${p.d} mm, ${p.kg} kg`, of: (p) => ROD[s(p, 'class')]![1], make: 'extrude', how: 'a core wire cut to length and coated with its flux paste, baked dry',
    spec: (p) => `${ROD[s(p, 'class')]![0]}; for ${ROD[s(p, 'class')]![3]}; about ${AMPS[n(p, 'd')]} A (typical); ${n(p, 'd') <= 2 ? 300 : n(p, 'd') <= 3.2 ? 350 : 450} mm long`,
    box: (p) => [60, 40, n(p, 'd') <= 2 ? 310 : n(p, 'd') <= 3.2 ? 360 : 460], g: (p) => n(p, 'kg') * 1000 + 60, look: 'rod',
  },
  {
    id: 'shieldgas', name: 'shielding gas cylinder', path: 'Tools/Welding/Gas', says: 'a cylinder of gas that keeps air off a weld', std: 'the gases and cylinder sizes sold; argon and mixes at 200 bar, CO₂ filled at 0.75 kg/l; cylinder masses typical',
    axes: [bare('gas', 'gas', Object.keys(GAS)), unit('L', 'water capacity', 'L', [10, 20, 50])],
    title: (p) => `${p.gas === 'Ar-18CO2' ? 'argon with 18 % CO₂' : p.gas === 'co2' ? 'CO₂' : 'argon'} cylinder, ${p.L} l`, of: (p) => `steel-alloy brass ${GAS[s(p, 'gas')]![0]}`, make: 'assemble', how: 'a seamless steel cylinder with its valve, filled with gas',
    spec: (p) => { const V = n(p, 'L'); return p.gas === 'co2' ? `${(V * 0.75).toFixed(1)} kg of liquid CO₂: about ${((V * 0.75) / 1.87).toFixed(1)} m³ of gas at 1 atm, 15 °C (ρ = 1.87 kg/m³); for ${GAS.co2![1]}` : `at 200 bar: about ${((V * 200) / 1.013 / 0.97 / 1000).toFixed(1)} m³ of gas at 1 atm (pV = ZnRT, Z ≈ 0.97, an estimate); for ${GAS[s(p, 'gas')]![1]}`; },
    box: (p) => { const [d, h] = CYL[n(p, 'L')]!; return [d, d, h]; }, g: (p) => { const V = n(p, 'L'); return CYL[V]![2] * 1000 + (p.gas === 'co2' ? V * 750 : ((V * 200) / 1.013 / 0.97) * 1.67); }, look: 'can',
  },
  {
    id: 'caliper', look: 'sheet', name: 'caliper', path: 'Tools/Measuring/Calipers', says: 'a sliding jaw gauge: outside, inside and depth', std: 'the ranges and readings sold; accuracy typical of datasheets',
    axes: [bare('type', 'reading', ['vernier', 'dial', 'digital']), ax('range', 'range', 'mm', [150, 200, 300])],
    title: (p) => `${p.range} mm ${p.type} caliper`, of: (p) => `stainless-304${p.type === 'digital' ? ' abs pcb-bare' : p.type === 'dial' ? ' brass pc' : ''}`, make: 'machine', how: 'a hardened stainless beam and slider ground true, its scale etched (or read by a dial or a capacitive sensor)',
    spec: (p) => `reads ${p.type === 'digital' ? '0.01' : '0.02'} mm; within about ±${n(p, 'range') <= 200 ? '0.03' : '0.04'} mm (typical)`, box: (p) => [n(p, 'range') + 85, n(p, 'range') / 4 + 35, 16], g: (p) => 0.0045 * n(p, 'range') ** 2 + 70,
  },
  {
    id: 'micrometer', name: 'micrometer', path: 'Tools/Measuring/Micrometers', says: 'a screw gauge: a fine thread turns a spindle onto the work', std: 'DIN 863 ranges; readings and accuracy typical of datasheets',
    axes: [bare('range', 'range', ['0-25', '25-50', '50-75', '75-100']), bare('type', 'reading', ['analog', 'digital'])],
    title: (p) => `${p.range} mm ${p.type} micrometer`, of: (p) => `steel-tool cast-iron tungsten-carbide${p.type === 'digital' ? ' abs pcb-bare' : ''}`, make: 'machine', how: 'a frame with a 0.5 mm pitch spindle lapped to its nut, carbide-tipped faces',
    spec: (p) => `${p.range} mm; a turn moves its spindle 0.5 mm, so 50 marks read 0.01 mm${p.type === 'digital' ? '; reads 0.001 mm' : ''}; within about ±2 µm (typical)`, box: (p) => { const hi = Number(s(p, 'range').split('-')[1]); return [hi + 120, hi + 40, 20]; }, g: (p) => 180 + Number(s(p, 'range').split('-')[1]) * 3, look: 'box',
  },
  {
    id: 'dialindicator', name: 'dial indicator', path: 'Tools/Measuring/Indicators', says: 'a plunger geared to a needle: how far a surface runs out', std: 'DIN 878 faces and ranges; graduation 0.01 mm',
    axes: [ax('range', 'range', 'mm', [5, 10, 30, 50])],
    title: (p) => `dial indicator 0–${p.range} mm, 0.01 mm`, of: () => 'brass steel-tool pc', make: 'assemble', how: 'a rack on its plunger turns gears and a hairspring-loaded needle behind a clear face',
    spec: (p) => `0.01 mm a mark, a turn of the needle 1 mm, ${p.range} mm in all; ${n(p, 'range') <= 5 ? 40 : 58} mm face`, box: (p) => { const f = n(p, 'range') <= 5 ? 40 : 58; return [f, f + 30 + n(p, 'range'), 30]; }, g: (p) => (n(p, 'range') <= 5 ? 90 : 120 + n(p, 'range') * 2), look: 'can',
  },
  {
    id: 'tapemeasure', name: 'tape measure', path: 'Tools/Measuring/Tapes', says: 'a curved steel blade that rolls back into its case', std: 'the lengths and blade widths sold; accuracy classes of MID 2014/32/EU',
    axes: [unit('L', 'length', 'm', Object.keys(TAPE).map(Number)), ax('w', 'blade', 'mm', (p) => TAPE[n(p, 'L')]!), bare('class', 'class', ['I', 'II'])],
    title: (p) => `${p.L} m tape measure, ${p.w} mm blade, class ${p.class}`, of: () => 'steel-spring abs pu nylon', make: 'assemble', how: 'a lacquered spring-steel blade on a coiled return spring in a moulded case, a hook riveted on its end',
    spec: (p) => { const [a, b] = TAPECLASS[s(p, 'class')]!, L = n(p, 'L'); return `class ${p.class}: within ±${r1(a + b * L)} mm over its whole ${L} m (MID: ±(a + bL), a = ${a}, b = ${b})`; }, box: (p) => { const k = r1(55 + n(p, 'L') * 4); return [k, k, 25 + n(p, 'w')]; }, g: (p) => 100 + n(p, 'L') * 40 + n(p, 'w') * 5, look: 'case',
  },
  {
    id: 'clamp', name: 'clamp', path: 'Tools/Hand tools/Clamps', says: 'a G-clamp, an F-clamp or a one-handed quick clamp, by how wide it opens', std: 'the openings and throats sold; masses an estimate; clamping forces not given here (makers\' figures vary)',
    axes: [bare('type', 'type', Object.keys(CLAMP)), ax('open', 'opening', 'mm', (p) => CLAMP[s(p, 'type')]![0])],
    title: (p) => `${p.open} mm ${p.type === 'quick' ? 'quick clamp' : `${p.type}-clamp`}`, of: (p) => CLAMP[s(p, 'type')]![2], make: (p) => (p.type === 'quick' ? 'assemble' : 'cast'), how: (p) => ({ G: 'a cast or forged C frame with a screw and swivel pad', F: 'a steel bar with a fixed jaw and a sliding cast arm with its screw', quick: 'a steel bar and a trigger that ratchets its jaw closed' } as Record<string, string>)[s(p, 'type')]!,
    spec: (p) => `opens to ${p.open} mm, reaches ${r1(CLAMP[s(p, 'type')]![1](n(p, 'open')))} mm in from the edge`, box: (p) => { const o = n(p, 'open'), t = CLAMP[s(p, 'type')]![1](o); return [r1(o + 80), r1(t + 40), 30]; }, g: (p) => CLAMP[s(p, 'type')]![3](n(p, 'open')), look: 'frame',
  },
  {
    id: 'hammer', look: 'rod', name: 'hammer', path: 'Tools/Hand tools/Hammers', says: 'a head on a handle: what it does is the energy its head carries in', std: 'the head masses sold (oz and lb); the energy at 10 m/s an estimate of a full swing',
    axes: [bare('type', 'type', Object.keys(HAMMER)), unit('oz', 'head', 'oz', (p) => HAMMER[s(p, 'type')]![0])],
    title: (p) => `${n(p, 'oz') >= 40 ? `${n(p, 'oz') / 16} lb` : `${p.oz} oz`} ${p.type} hammer`, of: (p) => HAMMER[s(p, 'type')]![2], make: (p) => (p.type === 'mallet' ? 'mould' : 'forge'), how: (p) => (p.type === 'mallet' ? 'a rubber head moulded on a wooden handle' : 'a head drop-forged, hardened on its face, fixed on its handle'),
    spec: (p) => { const m = (n(p, 'oz') * 28.35) / 1000; return `${(m * 1000).toFixed(0)} g head (1 oz = 28.35 g); at 10 m/s it carries ½mv² = ${(0.5 * m * 100).toFixed(0)} J`; }, box: (p) => { const L = HAMMER[s(p, 'type')]![1]; return [r1(L * 0.35), 35, L]; }, g: (p) => n(p, 'oz') * 28.35 + HAMMER[s(p, 'type')]![1] * 0.6,
  },
  {
    id: 'beaker', name: 'beaker', path: 'Lab/Glassware/Beakers', says: 'a low-form glass beaker with a spout, marked in millilitres', std: 'ISO 3819 low-form sizes (dimensions typical); borosilicate 3.3 (ISO 3585)',
    axes: [unit('ml', 'volume', 'ml', Object.keys(BEAKER).map(Number))],
    title: (p) => `${p.ml} ml beaker, low form, borosilicate`, of: () => 'borosilicate', make: 'blow', how: 'borosilicate tube or gob blown and pressed to shape, its spout formed, its scale printed and fired on',
    spec: (p) => { const [d, h] = BEAKER[n(p, 'ml')]!; return `${d} × ${h} mm (ISO 3819, typical); borosilicate 3.3: α = 3.3 × 10⁻⁶ /K (ISO 3585), so it takes sudden changes of about 100 K`; },
    box: (p) => { const [d, h] = BEAKER[n(p, 'ml')]!; return [d, d, h]; }, g: (p) => { const [d, h] = BEAKER[n(p, 'ml')]!, t = 0.8 + d / 100; return gOf((Math.PI * d * h + (Math.PI * d * d) / 4) * t, 2.23); }, look: 'tube',
  },
  {
    id: 'shackle', name: 'shackle', path: 'Hardware/Lifting/Shackles', says: 'a bow or dee of forged steel closed by a pin: the link between a sling and a load', std: 'EN 13889 grade 6 working load limits; body sizes and masses an estimate',
    axes: [unit('t', 'working load limit', 't', [0.5, 0.75, 1, 1.5, 2, 3.25, 4.75, 6.5, 8.5, 9.5, 12, 17]), bare('type', 'shape', ['bow', 'dee']), bare('pin', 'pin', ['screw', 'bolt'])],
    title: (p) => `${p.t} t ${p.type} shackle, ${p.pin} pin`, of: () => 'steel-alloy*2 zinc', make: 'forge', how: 'its body drop-forged from alloy steel, quenched and tempered, galvanised; its pin forged and threaded',
    spec: (p) => `WLL ${p.t} t; breaks at no less than ${r1(6 * n(p, 't'))} t (EN 13889: 6 × WLL); body about ${r1(8.7 * Math.sqrt(n(p, 't')))} mm (an estimate); ${p.pin === 'bolt' ? 'a bolt, nut and split pin, for long or lasting rigs' : 'a screw pin, for rigs taken down often'}`,
    box: (p) => { const d = 8.7 * Math.sqrt(n(p, 't')); return [r1(3.6 * d), r1(5.8 * d), r1(2.2 * d)]; }, g: (p) => 0.165 * (8.7 * Math.sqrt(n(p, 't'))) ** 3, look: 'ring',
  },
  {
    id: 'wirerope', name: 'steel wire rope', path: 'Hardware/Lifting/Wire rope', says: 'strands of steel wire laid round a core: for lifting, hauling and guying', std: 'EN 12385-4: breaking load K·d²·R/1000 at grade 1770, mass W′·d²; any length to the metre',
    axes: [bare('build', 'construction', Object.keys(ROPE)), ax('d', 'diameter', 'mm', [3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26]), unit('L', 'length', 'm', [10, 20, 50, 100, 200], [1, 1000, 1])],
    title: (p) => `${p.d} mm ${p.build} wire rope, ${p.L} m`, of: (p) => ROPE[s(p, 'build')]![2], make: 'draw', how: (p) => (p.build === '6x19-FC' ? 'galvanised wires laid into six strands of 19, closed round a fibre core' : 'galvanised wires laid into six strands of 36, closed round a steel rope core'),
    spec: (p) => { const [K, W] = ROPE[s(p, 'build')]!, d = n(p, 'd'), F = (K * d * d * 1770) / 1000; return `grade 1770: breaks at ${F.toFixed(1)} kN (EN 12385-4: K d² R / 1000, K = ${K}); ${((W * d * d)).toFixed(1)} kg per 100 m; works at ${(F / 5).toFixed(1)} kN at 5 : 1 (a common factor)`; },
    box: (p) => (n(p, 'L') >= 20 ? [400, 400, 150] : [250, 250, 80]), g: (p) => ROPE[s(p, 'build')]![1] * n(p, 'd') ** 2 * n(p, 'L') * 10, look: (p) => `coil w${p.d}`,
  },
];
