// Tools and consumables: drills, taps and dies, end mills, hole saws, saw blades, abrasives and cutting discs, hex keys,
// bits, screwdrivers, sockets, spanners, and solder. Sizes from DIN 338 (drills), ISO 2936 (hex keys), ISO 3318
// (spanners), FEPA P-grits (abrasives) and DIN 223 (dies); cutting speeds typical.

import { METRIC } from '../threads';
import { ax, bare, cyl, gOf, range, tagged, unit, type KindDef, type P } from './core';

const n = (p: P, k: string) => Number(p[k]);
const s = (p: P, k: string) => String(p[k]);
const dOf = (p: P) => Number(String(p.thread).slice(1));
/** DIN 338 jobber drills: overall and flute length at each diameter (mm), between them in proportion. */
const D338: [number, number, number][] = [[0.5, 22, 6], [1, 34, 12], [2, 49, 24], [3, 61, 33], [4, 75, 43], [5, 86, 52], [6, 93, 57], [7, 109, 69], [8, 117, 75], [9, 125, 81], [10, 133, 87], [11, 142, 94], [12, 151, 101], [13, 151, 101]];
const lerp = (d: number, i: 1 | 2) => { const k = D338.findIndex(([x]) => x >= d); if (k <= 0) return D338[0]![i]; const [x0, ...a] = D338[k - 1]!, [x1, ...b] = D338[k]!; return a[i - 1]! + ((b[i - 1]! - a[i - 1]!) * (d - x0)) / (x1 - x0); };
/** FEPA P-grits: the median grain (µm). */
const FEPA: Record<number, number> = { 40: 425, 60: 269, 80: 201, 100: 162, 120: 125, 150: 100, 180: 82, 220: 68, 240: 58.5, 280: 52.2, 320: 46.2, 400: 35, 500: 30.2, 600: 25.8, 800: 21.8, 1000: 18.3, 1200: 15.3, 1500: 12.6, 2000: 10.3 };
/** ISO 2936 hex keys: long and short arm (mm). */
const HEXKEY: Record<number, [number, number]> = { 1.5: [46.5, 15.5], 2: [52, 18], 2.5: [58.5, 20.5], 3: [66, 23], 4: [74, 29], 5: [85, 33], 6: [96, 38], 8: [108, 44], 10: [122, 50], 12: [137, 57], 14: [154, 70], 17: [177, 80], 19: [199, 89] };
const DRIVES = ['PH0', 'PH1', 'PH2', 'PH3', 'PZ0', 'PZ1', 'PZ2', 'PZ3', 'SL3', 'SL4', 'SL5.5', 'SL6.5', 'SL8', 'T6', 'T8', 'T10', 'T15', 'T20', 'T25', 'T27', 'T30', 'T40', 'H1.5', 'H2', 'H2.5', 'H3', 'H4', 'H5', 'H6', 'H8', 'SQ1', 'SQ2', 'SQ3'];
const SOLDER: Record<string, [string, string]> = { SAC305: ['solder', '217–220 °C, lead-free'], Sn63Pb37: ['solder-snpb', '183 °C, eutectic (contains lead)'], Sn60Pb40: ['solder-sn60', '183–190 °C (contains lead)'], Sn99Cu07: ['solder-sncu', '227 °C, lead-free'] };

export const TOOLS: KindDef[] = [
  {
    id: 'drillbit', name: 'twist drill', path: 'Tools/Cutting tools/Drills', says: 'a jobber-length twist drill', std: 'DIN 338, 0.5–13 mm in steps of 0.1 mm',
    axes: [ax('d', 'diameter', 'mm', range(0.5, 13, 0.1)), bare('grade', 'grade', ['HSS', 'HSSCo', 'TiN', 'carbide'])],
    title: (p) => `${p.d} mm twist drill, ${({ HSS: 'HSS', HSSCo: 'cobalt HSS (M35)', TiN: 'TiN-coated HSS', carbide: 'solid carbide' } as Record<string, string>)[s(p, 'grade')]}`, of: (p) => (p.grade === 'carbide' ? 'tungsten-carbide' : 'steel-hss'), make: 'grind', how: (p) => (p.grade === 'carbide' ? 'ground from a sintered carbide rod' : 'rolled or ground from high-speed steel, hardened, its point ground to 118° (135° split for cobalt)'),
    spec: (p) => { const d = n(p, 'd'); return `${lerp(d, 1).toFixed(0)} mm long, ${lerp(d, 2).toFixed(0)} mm of flute (DIN 338); in steel at about 25 m/min: ${((1000 * 25) / (Math.PI * d)).toFixed(0)} rpm (n = 1000 v / πd, typical HSS)`; },
    box: (p) => [n(p, 'd'), n(p, 'd'), lerp(n(p, 'd'), 1)], g: (p) => gOf(cyl(n(p, 'd'), lerp(n(p, 'd'), 1)) * 0.8, p.grade === 'carbide' ? 14.9 : 8.1),
  },
  {
    id: 'tap', name: 'thread tap', path: 'Tools/Cutting tools/Taps and dies', says: 'a fluted, hardened screw that cuts a thread inside a drilled hole', std: 'ISO 261 coarse threads M2–M24; tap drill = diameter − pitch',
    axes: [bare('thread', 'thread', Object.keys(METRIC).filter((t) => Number(t.slice(1)) >= 2)), bare('type', 'type', ['taper', 'plug', 'bottoming', 'spiralpoint', 'spiralflute']), bare('grade', 'grade', ['HSS', 'HSSCo'])],
    title: (p) => `${p.thread} ${({ taper: 'taper', plug: 'plug', bottoming: 'bottoming', spiralpoint: 'spiral-point', spiralflute: 'spiral-flute' } as Record<string, string>)[s(p, 'type')]} tap, ${p.grade === 'HSSCo' ? 'cobalt HSS' : 'HSS'}`, of: () => 'steel-hss', make: 'grind', how: 'ground from high-speed steel: its thread, flutes and lead chamfer',
    spec: (p) => { const T = METRIC[s(p, 'thread')]!; return `${T.p} mm pitch; drill ${(dOf(p) - T.p).toFixed(2)} mm first (d − p); ${p.type === 'spiralpoint' ? 'pushes chips ahead: through holes' : p.type === 'spiralflute' ? 'lifts chips out: blind holes' : p.type === 'bottoming' ? 'cuts to a hole\'s bottom' : 'starts straight'}`; },
    box: (p) => [dOf(p), dOf(p), 40 + 4 * dOf(p)], g: (p) => gOf(cyl(dOf(p), 40 + 4 * dOf(p)) * 0.7, 8.1),
  },
  {
    id: 'threaddie', name: 'round die', path: 'Tools/Cutting tools/Taps and dies', says: 'a hardened ring with a cutting thread inside, turned in a stock to cut a thread on a rod', std: 'DIN 223 outsides, ISO 261 threads M2–M24',
    axes: [bare('thread', 'thread', Object.keys(METRIC).filter((t) => Number(t.slice(1)) >= 2))],
    title: (p) => `${p.thread} round die`, of: () => 'steel-hss', make: 'grind', how: 'high-speed steel turned, its thread and chip holes cut, split for setting, hardened',
    spec: (p) => { const d = dOf(p), D = d <= 2.5 ? 16 : d <= 6 ? 20 : d <= 9 ? 25 : d <= 11 ? 30 : d <= 14 ? 38 : d <= 20 ? 45 : 55; return `${D} mm outside (DIN 223); rod a little under ${d} mm`; }, box: (p) => { const d = dOf(p), D = d <= 2.5 ? 16 : d <= 6 ? 20 : d <= 9 ? 25 : d <= 11 ? 30 : d <= 14 ? 38 : d <= 20 ? 45 : 55; return [D, D, D / 3]; }, g: (p) => { const d = dOf(p), D = d <= 2.5 ? 16 : d <= 6 ? 20 : d <= 9 ? 25 : d <= 11 ? 30 : d <= 14 ? 38 : d <= 20 ? 45 : 55; return gOf(cyl(D, D / 3) * 0.8, 8.1); },
  },
  {
    id: 'endmill', name: 'end mill', path: 'Tools/Cutting tools/End mills', says: 'a milling cutter that cuts on its end and its sides', std: 'the diameters, flute counts and ends sold; cutting speeds typical',
    axes: [ax('d', 'diameter', 'mm', [1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20]), unit('z', 'flutes', 'F', [1, 2, 3, 4]), bare('end', 'end', ['flat', 'ball', 'radius']), bare('grade', 'made of', ['carbide', 'HSS'])],
    title: (p) => `${p.d} mm ${p.z}-flute ${p.end === 'radius' ? 'corner-radius' : p.end} end mill, ${p.grade === 'carbide' ? 'carbide' : 'HSS'}`, of: (p) => (p.grade === 'carbide' ? 'tungsten-carbide' : 'steel-hss'), make: 'grind', how: 'ground from a carbide (or HSS) rod: its helix, flutes and end',
    spec: (p) => { const vc = p.grade === 'carbide' ? 250 : 60; return `in aluminium at about ${vc} m/min: ${((1000 * vc) / (Math.PI * n(p, 'd'))).toFixed(0)} rpm (n = 1000 v / πd; typical ${p.grade}); ${n(p, 'z') <= 2 ? 'room for chips: aluminium and plastics' : 'stiffer: steel'}`; },
    box: (p) => [n(p, 'd'), n(p, 'd'), Math.max(38, 5 * n(p, 'd') + 30)], g: (p) => gOf(cyl(Math.max(3, n(p, 'd')), Math.max(38, 5 * n(p, 'd') + 30)) * 0.9, p.grade === 'carbide' ? 14.9 : 8.1),
  },
  {
    id: 'holesaw', name: 'hole saw', path: 'Tools/Cutting tools/Hole saws', says: 'a toothed cup on an arbor that cuts a round hole, leaving a plug', std: 'the diameters sold',
    axes: [ax('d', 'diameter', 'mm', [14, 16, 19, 20, 22, 25, 29, 30, 32, 35, 38, 40, 44, 51, 57, 60, 64, 68, 76, 83, 89, 102, 114, 127, 152]), bare('type', 'teeth', ['bimetal', 'carbide', 'diamond'])],
    title: (p) => `${p.d} mm hole saw, ${p.type === 'bimetal' ? 'bi-metal' : p.type}`, of: (p) => `steel-low ${p.type === 'bimetal' ? 'steel-hss' : p.type === 'carbide' ? 'tungsten-carbide' : 'graphite'}`, make: 'weld', how: (p) => (p.type === 'bimetal' ? 'an HSS tooth strip electron-beam welded to a spring-steel cup' : p.type === 'carbide' ? 'carbide tips brazed to a steel cup' : 'diamond grit bonded to a steel cup\'s rim'),
    spec: (p) => `${p.d} mm hole, about 38 mm deep; at about ${((1000 * 25) / (Math.PI * n(p, 'd'))).toFixed(0)} rpm in steel (typical)`, box: (p) => [n(p, 'd'), n(p, 'd'), 45], g: (p) => gOf(Math.PI * n(p, 'd') * 1.2 * 45 + cyl(n(p, 'd'), 3), 7.85),
  },
  {
    id: 'sawblade', name: 'circular saw blade', path: 'Tools/Cutting tools/Saw blades', says: 'a steel disc with carbide-tipped teeth', std: 'the diameters, tooth counts and bores sold',
    axes: [ax('d', 'diameter', 'mm', [140, 160, 165, 184, 190, 210, 216, 235, 250, 254, 305]), unit('z', 'teeth', 'T', (p) => [24, 40, 48, 60, 80, 96].filter((z) => z <= n(p, 'd') / 2.5)), unit('bore', 'bore', 'mm', (p) => (n(p, 'd') <= 190 ? [20] : [30]))],
    title: (p) => `${p.d} mm saw blade, ${p.z} teeth, ${p.bore} mm bore`, of: () => 'steel-tool tungsten-carbide', make: 'grind', how: 'a tensioned steel plate laser-cut, carbide tips brazed on and ground',
    spec: (p) => `${p.z} teeth: ${n(p, 'z') <= 24 ? 'fast rip cuts' : n(p, 'z') <= 48 ? 'general purpose' : 'fine cross-cuts and sheet'}; kerf about ${n(p, 'd') <= 190 ? 2.4 : 3} mm (typical)`, box: (p) => [n(p, 'd'), n(p, 'd'), 2.8], g: (p) => gOf(cyl(n(p, 'd'), 1.8), 7.85),
  },
  {
    id: 'abrasive', name: 'abrasive paper', path: 'Tools/Abrasives/Sanding', says: 'abrasive grit bonded to paper or cloth, by its FEPA grit', std: 'FEPA P-grits P40–P2000 with their median grain sizes; the sheets, discs and belts sold',
    axes: [tagged('P', 'P', 'grit', '', Object.keys(FEPA).map(Number)), bare('form', 'form', ['sheet', 'disc125', 'disc150', 'belt75x533']), bare('grain', 'grain', ['alox', 'sic'])],
    title: (p) => `P${p.P} ${p.grain === 'sic' ? 'silicon carbide wet-and-dry' : 'aluminium oxide'} ${p.form === 'sheet' ? 'sheet 230 × 280 mm' : p.form === 'belt75x533' ? 'belt 75 × 533 mm' : `disc ${String(p.form).replace('disc', '')} mm`}`, of: (p) => `${p.grain === 'sic' ? 'sic' : 'alumina'} paper phenolic`, make: 'laminate', how: 'graded grit dropped electrostatically onto a resin-coated backing, sized with more resin, cured',
    spec: (p) => `P${p.P}: median grain about ${FEPA[n(p, 'P')]} µm (FEPA 43-2); ${n(p, 'P') <= 80 ? 'coarse: removes stock' : n(p, 'P') <= 220 ? 'medium: smooths' : 'fine: finishing'}`, box: (p) => (p.form === 'sheet' ? [230, 280, 0.5] : p.form === 'belt75x533' ? [75, 170, 75] : [Number(String(p.form).replace('disc', '')), Number(String(p.form).replace('disc', '')), 0.6]), g: (p) => (p.form === 'sheet' ? 12 : p.form === 'belt75x533' ? 30 : 4),
  },
  {
    id: 'cutdisc', name: 'cutting or grinding disc', path: 'Tools/Abrasives/Discs', says: 'a resin-bonded abrasive disc for an angle grinder', std: 'the diameters and thicknesses sold',
    axes: [unit('d', 'diameter', 'mm', [115, 125, 180, 230]), unit('t', 'thickness', 'mm', [1, 1.6, 3, 6]), bare('for', 'for', ['metal', 'stone', 'inox'])],
    title: (p) => `${p.d} × ${p.t} mm ${n(p, 't') >= 6 ? 'grinding' : 'cutting'} disc for ${p.for === 'inox' ? 'stainless' : p.for}`, of: (p) => `${p.for === 'stone' ? 'sic' : 'alumina'} phenolic fibreglass`, make: 'mould', how: 'grit and phenolic resin pressed between glass-fibre webs and baked', spec: (p) => `${p.d} mm, 22.23 mm bore; up to ${(80 / (Math.PI * n(p, 'd') / 1000) * 60).toFixed(0)} rpm (80 m/s, EN 12413)`,
    box: (p) => [n(p, 'd'), n(p, 'd'), n(p, 't')], g: (p) => gOf(cyl(n(p, 'd'), n(p, 't')), 2.5),
  },
  {
    id: 'hexkey', name: 'hex key', path: 'Tools/Hand tools/Hex keys', says: 'an L-shaped hexagon bar for socket screws', std: 'ISO 2936 sizes and arm lengths',
    axes: [ax('af', 'size', 'mm', Object.keys(HEXKEY).map(Number)), bare('form', 'form', ['L', 'ballend', 'Thandle'])],
    title: (p) => `${p.af} mm hex key, ${p.form === 'ballend' ? 'ball-end' : p.form === 'Thandle' ? 'T-handle' : 'plain L'}`, of: (p) => `steel-tool${p.form === 'Thandle' ? ' pp' : ''}`, make: 'forge', alt: 'machine', how: 'chrome-vanadium hex bar cut, bent, hardened and tempered', spec: (p) => { const [l1, l2] = HEXKEY[n(p, 'af')]!; return `${p.af} mm A/F; arms ${l1} × ${l2} mm (ISO 2936)${p.form === 'ballend' ? '; its ball end turns a screw from up to about 25° off' : ''}`; },
    box: (p) => { const [l1, l2] = HEXKEY[n(p, 'af')]!; return [l2, n(p, 'af'), l1]; }, g: (p) => { const [l1, l2] = HEXKEY[n(p, 'af')]!; return gOf((Math.sqrt(3) / 2) * n(p, 'af') ** 2 * (l1 + l2), 7.85) + (p.form === 'Thandle' ? 25 : 0); },
  },
  {
    id: 'driverbit', name: 'screwdriver bit', path: 'Tools/Hand tools/Bits', says: 'a ¼-inch hex shank bit for a driver or drill', std: 'the drive tips (ISO 8764 cross, ISO 10664 hexalobular, hex and square) and lengths sold',
    axes: [bare('tip', 'tip', DRIVES), unit('L', 'length', 'mm', [25, 50, 75, 100, 150])],
    title: (p) => `${p.tip} bit, ${p.L} mm`, of: () => 'steel-tool', make: 'forge', alt: 'machine', how: 'S2 tool steel hex bar, its tip formed and ground, hardened', spec: (p) => `¼ in (6.35 mm) hex; ${p.tip}`,
    box: (p) => [7.3, 7.3, n(p, 'L')], g: (p) => gOf(35 * n(p, 'L'), 7.85),
  },
  {
    id: 'screwdriver', name: 'screwdriver', path: 'Tools/Hand tools/Screwdrivers', says: 'a screwdriver: a hardened blade in a handle', std: 'the tips and blade lengths sold',
    axes: [bare('tip', 'tip', DRIVES.filter((d) => !d.startsWith('SQ'))), unit('L', 'blade', 'mm', [50, 75, 100, 125, 150, 200])],
    title: (p) => `${p.tip} screwdriver, ${p.L} mm blade`, of: () => 'steel-tool pp rubber', make: 'assemble', how: 'a chrome-vanadium blade, its tip formed and hardened, moulded into a two-part handle', spec: (p) => `${p.tip}; ${p.L} mm blade`,
    box: (p) => [30, 30, n(p, 'L') + 100], g: (p) => 40 + n(p, 'L') * 0.35,
  },
  {
    id: 'socket', name: 'socket', path: 'Tools/Hand tools/Sockets', says: 'a socket for a ratchet, by its drive and its hex', std: 'the drives and metric sizes sold',
    axes: [bare('drive', 'drive', ['1/4', '3/8', '1/2']), unit('s', 'size', 'mm', (p) => (p.drive === '1/4' ? range(4, 14, 1) : p.drive === '3/8' ? range(6, 22, 1) : [...range(8, 24, 1), 27, 30, 32])), bare('point', 'points', ['6pt', '12pt']), bare('depth', 'depth', ['standard', 'deep', 'impact'])],
    title: (p) => `${p.s} mm ${p.point === '6pt' ? 'six' : 'twelve'}-point ${p.depth === 'standard' ? '' : `${p.depth} `}socket, ${p.drive}" drive`, of: (p) => (p.depth === 'impact' ? 'steel-alloy' : 'steel-tool chromium'), make: 'forge', alt: 'machine', how: (p) => (p.depth === 'impact' ? 'cold-forged chrome-molybdenum, black-phosphated' : 'cold-forged chrome-vanadium, its hex broached, chrome-plated'),
    spec: (p) => `${p.s} mm; ${p.drive}" square drive`, box: (p) => { const D = n(p, 's') * 1.45 + 4; return [D, D, p.depth === 'deep' ? 63 : 32 + n(p, 's') * 0.5]; }, g: (p) => { const D = n(p, 's') * 1.45 + 4; return gOf(cyl(D, p.depth === 'deep' ? 63 : 32) * 0.45, 7.85); },
  },
  {
    id: 'spanner', name: 'combination spanner', path: 'Tools/Hand tools/Spanners', says: 'an open jaw at one end, a ring at the other', std: 'ISO 3318 sizes; lengths typical',
    axes: [unit('s', 'size', 'mm', [5.5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 27, 30, 32])],
    title: (p) => `${p.s} mm combination spanner`, of: () => 'steel-tool', make: 'forge', how: 'drop-forged chrome-vanadium, its jaw and ring machined, hardened and chromed', spec: (p) => `${p.s} mm; about ${(n(p, 's') * 11 + 60).toFixed(0)} mm long (typical)`,
    box: (p) => [n(p, 's') * 2.2, 6, n(p, 's') * 11 + 60], g: (p) => n(p, 's') ** 2 * 0.9 + 20,
  },
  {
    id: 'solderwire', name: 'solder wire', path: 'Tools/Soldering/Solder', says: 'a reel of flux-cored solder wire', std: 'the alloys, diameters and reels sold',
    axes: [bare('alloy', 'alloy', Object.keys(SOLDER)), ax('d', 'diameter', 'mm', [0.3, 0.5, 0.6, 0.8, 1, 1.2, 1.5]), unit('g', 'reel', 'g', [50, 100, 250, 500, 1000])],
    title: (p) => `${String(p.alloy).replace('Sn99Cu07', 'Sn99.3Cu0.7')} solder wire ${p.d} mm, ${p.g} g`, of: (p) => `${SOLDER[s(p, 'alloy')]![0]} rosin pp`, make: 'extrude', how: 'the alloy extruded round a core of rosin flux (about 2 %) and drawn to diameter',
    spec: (p) => `melts at ${SOLDER[s(p, 'alloy')]![1]}; about ${(n(p, 'g') / (7.4 * Math.PI * (n(p, 'd') / 2) ** 2)).toFixed(0)} m on the reel`, box: (p) => [Math.cbrt(n(p, 'g')) * 12, Math.cbrt(n(p, 'g')) * 12, Math.cbrt(n(p, 'g')) * 6], g: (p) => n(p, 'g') * 1.1,
  },
];
