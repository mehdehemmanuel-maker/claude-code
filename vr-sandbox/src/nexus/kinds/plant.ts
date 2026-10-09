// The pipework, power and fixings of plant and building: steel pipe by schedule, flanges and their gaskets, JIC
// fittings, push-fit plumbing; solenoids, DC-DC converters, inverters, float, limit and flow switches, cable lugs;
// universal joints; 3D printer nozzles; float glass, rebar and cement. Numbers from ASME B36.10M (pipe), EN 1092-1 and
// EN 1514-1 (flanges, gaskets), SAE J514 (JIC threads), DIN 808 (joints), DIN 46235 (lugs), EN 572 and EN 12150
// (glass), BS 4449 (rebar), EN 197-1 (cement), and the laws in each (Barlow's P = 2St/D, the Cardan joint's speed
// ratio, D = Vout/Vin); what makers sell, or a datasheet's typical, is said so.

import { ax, bare, cyl, gOf, ring, unit, type KindDef, type P } from './core';

const n = (p: P, k: string) => Number(p[k]);
const s = (p: P, k: string) => String(p[k]);
const r1 = (x: number) => +x.toFixed(1);

/** ASME B36.10M: outside diameter, wall at schedule 40 and 80 (mm), by nominal pipe size. */
const NPS: Record<string, [number, number, number]> = { '1/2': [21.3, 2.77, 3.73], '3/4': [26.7, 2.87, 3.91], '1': [33.4, 3.38, 4.55], '1-1/4': [42.2, 3.56, 4.85], '1-1/2': [48.3, 3.68, 5.08], '2': [60.3, 3.91, 5.54], '2-1/2': [73, 5.16, 7.01], '3': [88.9, 5.49, 7.62], '4': [114.3, 6.02, 8.56], '6': [168.3, 7.11, 10.97], '8': [219.1, 8.18, 12.7], '10': [273.1, 9.27, 15.09], '12': [323.8, 10.31, 17.48] };
/** EN 1092-1 PN16: outside, bolt circle, bolts and their size (mm), and the pipe it takes, by DN. */
const PN16: Record<number, [number, number, number, number, number]> = { 15: [95, 65, 4, 12, 21.3], 20: [105, 75, 4, 12, 26.9], 25: [115, 85, 4, 12, 33.7], 32: [140, 100, 4, 16, 42.4], 40: [150, 110, 4, 16, 48.3], 50: [165, 125, 4, 16, 60.3], 80: [200, 160, 8, 16, 88.9], 100: [220, 180, 8, 16, 114.3], 125: [250, 210, 8, 16, 139.7], 150: [285, 240, 8, 20, 168.3], 200: [340, 295, 12, 20, 219.1], 250: [405, 355, 12, 24, 273], 300: [460, 410, 12, 24, 323.9] };
/** EN 1092-1 bolt holes: 14 for M12, 18 for M16, 22 for M20, 26 for M24. */
const hole = (M: number) => M + 2;
/** SAE J514 JIC 37° threads by dash size. */
const JIC: Record<string, [string, number]> = { '-4': ['7/16-20 UNF', 11.1], '-6': ['9/16-18 UNF', 14.3], '-8': ['3/4-16 UNF', 19.1], '-10': ['7/8-14 UNF', 22.2], '-12': ['1-1/16-12 UN', 27], '-16': ['1-5/16-12 UN', 33.3] };
/** DIN 808 joints: outside (mm, typical) by bore. */
const UJ: Record<number, number> = { 6: 16, 8: 16, 10: 22, 12: 25, 16: 32, 20: 40, 25: 45, 32: 56, 40: 63, 50: 80 };
/** Hot ends' nozzles: the most melt they pass (mm³/s, typical). */
const NOZZLE: Record<string, [number, number]> = { MK8: [12, 13], V6: [15, 12.5], Volcano: [28, 21] };
/** DIN 46235 lugs: the studs each cross-section is made for. */
const LUG: Record<number, number[]> = { 16: [6, 8, 10], 25: [6, 8, 10, 12], 35: [8, 10, 12], 50: [8, 10, 12], 70: [10, 12, 16], 95: [10, 12, 16], 120: [12, 16], 150: [12, 16], 185: [12, 16], 240: [12, 16] };
/** Water flow sensors by part: thread, range (l/min) and pulses per litre (datasheet). */
const FLOW: Record<string, [string, string, number]> = { 'YF-S201': ['G1/2', '1–30', 450], 'YF-S401': ['G1/4 (barbed)', '0.3–6', 5880], FS300A: ['G3/4', '1–60', 330] };
/** DC-DC modules: currents sold and ranges (V, typical), by type. */
const DCDC: Record<string, [number[], string, string]> = { buck: [[1, 2, 3, 5, 10], '4.5–28', '0.8–20'], boost: [[1, 2, 4], '3–32', '5–35'], 'buck-boost': [[1, 2, 3], '3–30', '1.25–30'] };

export const PLANT: KindDef[] = [
  {
    id: 'steelpipe', name: 'steel pipe', path: 'Fluid/Tubing and hose/Steel pipe', says: 'carbon steel pipe by its nominal size and schedule: the pressure pipe of plant', std: 'ASME B36.10M outside diameters and walls (schedules 40 and 80); any length to 6 m cut to the centimetre',
    axes: [bare('nps', 'nominal size', Object.keys(NPS)), ax('sch', 'schedule', '', [40, 80]), unit('L', 'length', 'm', [1, 3, 6], [0.1, 6, 0.01])],
    title: (p) => `${p.nps} in schedule ${p.sch} steel pipe, ${p.L} m`, of: () => 'steel-low', make: 'roll', alt: 'weld', how: 'pierced and rolled seamless, or formed and welded from strip, its ends cut square',
    spec: (p) => { const [D, t40, t80] = NPS[s(p, 'nps')]!, t = n(p, 'sch') === 40 ? t40 : t80, P = (2 * 138 * t) / D; return `${D} × ${t} mm (ASME B36.10M); holds about ${(P * 10).toFixed(0)} bar by Barlow, P = 2 S t / D, with S = 138 MPa (A106 B, an assumption, no allowance for threads or corrosion)`; },
    box: (p) => { const D = NPS[s(p, 'nps')]![0]; return [D, D, r1(n(p, 'L') * 1000)]; }, g: (p) => { const [D, t40, t80] = NPS[s(p, 'nps')]!, t = n(p, 'sch') === 40 ? t40 : t80; return gOf(ring(D, D - 2 * t, n(p, 'L') * 1000), 7.85); }, look: 'tube',
  },
  {
    id: 'flange', name: 'pipe flange', path: 'Fluid/Fittings/Flanges', says: 'a steel ring bolted to its mate across a gasket: a pipe joint that can be taken apart', std: 'EN 1092-1 PN16 dimensions; thickness and mass an estimate',
    axes: [ax('DN', 'size', '', Object.keys(PN16).map(Number)), bare('type', 'type', ['slip-on', 'weld-neck', 'blind'])],
    title: (p) => `DN${p.DN} PN16 ${p.type} flange`, of: () => 'steel-low', make: 'forge', alt: 'machine', how: 'forged and machined: its face, its bore and its bolt holes',
    spec: (p) => { const [D, k, nb, M, od] = PN16[n(p, 'DN')]!; return `${D} mm across, ${nb} × M${M} bolts on a ${k} mm circle in ${hole(M)} mm holes (EN 1092-1, PN16)${p.type === 'blind' ? '; closes the end' : `; for ${od} mm pipe`}`; },
    box: (p) => { const D = PN16[n(p, 'DN')]![0], t = r1(16 + n(p, 'DN') / 20); return [D, D, p.type === 'weld-neck' ? r1(t * 2.6) : t]; }, g: (p) => { const [D, , , , od] = PN16[n(p, 'DN')]!, t = 16 + n(p, 'DN') / 20; return gOf(p.type === 'blind' ? cyl(D, t) : ring(D, od, t) * (p.type === 'weld-neck' ? 1.4 : 1), 7.85); }, look: 'ring',
  },
  {
    id: 'flangegasket', name: 'flange gasket', path: 'Fluid/Seals/Gaskets', says: 'a flat ring pressed between two flanges by their bolts', std: 'EN 1514-1 inside-bolt-circle gaskets for PN16; thickness 2 or 3 mm',
    axes: [ax('DN', 'size', '', Object.keys(PN16).map(Number)), bare('matter', 'material', ['fibre', 'PTFE', 'EPDM']), ax('t', 'thickness', 'mm', [2, 3])],
    title: (p) => `DN${p.DN} PN16 ${p.matter} gasket, ${p.t} mm`, of: (p) => (p.matter === 'fibre' ? 'nbr fibreglass' : p.matter === 'PTFE' ? 'ptfe' : 'epdm'), make: 'stamp', how: 'cut from sheet to fit inside the bolt circle',
    spec: (p) => { const [, k, , M, od] = PN16[n(p, 'DN')]!; return `${od} mm bore, ${k - hole(M)} mm outside (inside its bolts, EN 1514-1); ${p.matter === 'fibre' ? 'water, steam and oil' : p.matter === 'PTFE' ? 'almost any chemical' : 'water and steam, not oil'}`; },
    box: (p) => { const [, k, , M] = PN16[n(p, 'DN')]!; return [k - hole(M), k - hole(M), n(p, 't')]; }, g: (p) => { const [, k, , M, od] = PN16[n(p, 'DN')]!; return gOf(ring(k - hole(M), od, n(p, 't')), p.matter === 'PTFE' ? 2.2 : 1.6); }, look: 'ring',
  },
  {
    id: 'jicfitting', name: 'JIC hydraulic fitting', path: 'Fluid/Fittings/Hydraulic fittings', says: 'a 37° flared fitting: male cone meets female swivel nut, sealed metal to metal', std: 'SAE J514 dash sizes and threads',
    axes: [bare('dash', 'size', Object.keys(JIC)), bare('type', 'type', ['union', 'elbow90', 'tee', 'BSPP-adapter', 'cap'])],
    title: (p) => `JIC ${p.dash} ${p.type === 'BSPP-adapter' ? 'to BSPP adapter' : p.type === 'elbow90' ? '90° elbow' : p.type}`, of: (p) => `steel-low*${p.type === 'tee' ? 3 : p.type === 'cap' ? 1 : 2} zinc`, make: 'machine', how: 'machined from steel bar or forgings, its 37° cones cut true, zinc-nickel plated',
    spec: (p) => `${JIC[s(p, 'dash')]![0]} thread, 37° flare (SAE J514); its pressure rating hangs on its size and its maker`, box: (p) => { const d = JIC[s(p, 'dash')]![1]; return p.type === 'tee' ? [d * 3, d * 2, d * 1.3] : p.type === 'elbow90' ? [d * 2.2, d * 2.2, d * 1.3] : [d * 1.3, d * 1.3, d * (p.type === 'cap' ? 1.3 : 2.8)]; }, g: (p) => JIC[s(p, 'dash')]![1] ** 2 * (p.type === 'tee' ? 0.5 : 0.3), look: (p) => (p.type === 'cap' || p.type === 'union' ? 'hex' : 'box'),
  },
  {
    id: 'pushfit', name: 'push-fit plumbing fitting', path: 'Fluid/Fittings/Push-fit fittings', says: 'a plumbing fitting that grips copper or PEX pipe pushed into it', std: 'the sizes and shapes sold for 10–28 mm pipe; pressure ratings typical',
    axes: [ax('d', 'for pipe', 'mm', [10, 15, 22, 28]), bare('type', 'type', ['straight', 'elbow', 'tee', 'reducer', 'stopend', 'tapconnector'])],
    title: (p) => `${p.d} mm push-fit ${p.type === 'tapconnector' ? 'tap connector' : p.type === 'stopend' ? 'stop end' : p.type}`, of: (p) => `pom*${p.type === 'tee' ? 3 : 2} epdm stainless-304`, make: 'mould', how: 'an acetal body, an EPDM O-ring and a stainless grab ring at each end, a collet that releases it',
    spec: (p) => `for ${p.d} mm copper or PEX; about 10 bar at 20 °C, 6 bar at 65 °C (typical); push in past its O-ring to seal`, box: (p) => { const k = n(p, 'd') * 1.9; return p.type === 'tee' ? [r1(k * 2.4), r1(k * 1.7), r1(k)] : p.type === 'elbow' ? [r1(k * 1.7), r1(k * 1.7), r1(k)] : [r1(k), r1(k), r1(k * 2.6)]; }, g: (p) => n(p, 'd') ** 2 * 0.06 * (p.type === 'tee' ? 1.5 : 1), look: (p) => (p.type === 'straight' || p.type === 'stopend' ? 'tube' : 'box'),
  },
  {
    id: 'solenoid', name: 'linear solenoid', path: 'Electrical/Motors and actuators/Solenoids', says: 'a coil that pulls an iron plunger in: a short, strong push or pull', std: 'the frame sizes, strokes and voltages sold; powers typical',
    axes: [ax('frame', 'body', 'mm', [20, 25, 30, 40, 50]), unit('L', 'stroke', 'mm', (p) => [5, 10, 15, 20].filter((x) => x <= n(p, 'frame') / 2)), unit('V', 'coil', 'V', [12, 24]), bare('duty', 'duty', ['100%', '25%'])],
    title: (p) => `${p.frame} mm solenoid, ${p.L} mm stroke, ${p.V} V, ${p.duty} duty`, of: () => 'steel-low*2 magnet-wire steel-spring nylon', make: 'wind', how: 'a coil wound on a bobbin in a steel frame, a steel plunger sliding through it, a return spring',
    spec: (p) => { const W = (n(p, 'frame') ** 2 * 0.012) * (p.duty === '25%' ? 4 : 1); return `about ${r1(W)} W, ${r1(W / n(p, 'V'))} A at ${p.V} V (typical); its pull is strongest closed and falls steeply with stroke${p.duty === '25%' ? '; on no more than a quarter of the time' : ''}`; },
    box: (p) => [n(p, 'frame'), n(p, 'frame'), r1(n(p, 'frame') * 1.3 + n(p, 'L'))], g: (p) => gOf(n(p, 'frame') ** 2 * n(p, 'frame') * 1.3, 7.85) * 0.55, look: 'can',
  },
  {
    id: 'dcdc', name: 'DC-DC converter module', path: 'Electrical/Power/DC-DC converters', says: 'a switching regulator on a small board: one DC voltage to another, efficiently', std: 'the types and currents sold; input and output ranges and efficiency typical',
    axes: [bare('type', 'type', Object.keys(DCDC)), unit('A', 'current', 'A', (p) => DCDC[s(p, 'type')]![0])],
    title: (p) => `${p.A} A ${p.type} converter module`, of: () => 'pcb-bare ic-package smd-passives ferrite-soft magnet-wire', make: 'solder', how: 'a switching chip, an inductor, diodes and capacitors on a small board, a trimmer to set its output',
    spec: (p) => { const [, vin, vout] = DCDC[s(p, 'type')]!; return `${vin} V in, ${vout} V out, to ${p.A} A, about 90 % efficient (typical); ${p.type === 'buck' ? 'steps down: V_out = D V_in' : p.type === 'boost' ? 'steps up: V_out = V_in / (1 − D)' : 'up or down: V_out = V_in D / (1 − D)'}, D its switch's duty`; },
    box: (p) => [r1(22 + n(p, 'A') * 4), r1(17 + n(p, 'A') * 2), 12], g: (p) => 4 + n(p, 'A') * 3, look: 'board',
  },
  {
    id: 'powerinverter', name: 'power inverter', path: 'Electrical/Power/Inverters', says: 'a box that makes 230 V AC from a 12 or 24 V battery', std: 'the powers and waveforms sold; 90 % efficiency typical',
    axes: [unit('W', 'power', 'W', [150, 300, 600, 1000, 1500, 2000, 3000]), unit('V', 'battery', 'V', [12, 24]), bare('wave', 'waveform', ['modified-sine', 'pure-sine'])],
    title: (p) => `${p.W} W ${s(p, 'wave').replace('-', ' ')} inverter, ${p.V} V`, of: () => 'al-6063 pcb-bare ic-package smd-passives ferrite-soft magnet-wire copper', make: 'assemble', how: 'MOSFETs chop the battery\'s DC through a transformer and an H-bridge into 50 Hz, in a finned aluminium case with a fan',
    spec: (p) => { const I = n(p, 'W') / (n(p, 'V') * 0.9); return `at full power it draws I = P / (V η) = ${I.toFixed(0)} A from the battery (η 0.9, typical): fuse and cable it for that; ${p.wave === 'pure-sine' ? 'a clean sine, for anything' : 'a stepped wave: motors run hot and some chargers hum'}`; },
    box: (p) => { const k = Math.cbrt(n(p, 'W')); return [r1(k * 14), r1(k * 9), r1(k * 5)]; }, g: (p) => 400 + n(p, 'W') * 1.6, look: 'case',
  },
  {
    id: 'floatswitch', name: 'float switch', path: 'Electrical/Sensors/Level switches', says: 'a float with a magnet that closes a reed switch as the level reaches it', std: 'the forms sold; contact ratings typical',
    axes: [bare('form', 'form', ['vertical', 'side-mount', 'cable']), bare('matter', 'material', ['PP', 'stainless']), bare('contact', 'contact', ['NO', 'NC'])],
    title: (p) => `${p.form} float switch, ${p.matter}, ${p.contact}`, of: () => 'float ring-magnet float-stem reed-switch insulated-conductor*2 cable-jacket', make: 'assemble', how: 'a hollow float carrying a magnet slides on a stem holding a sealed reed switch',
    spec: (p) => `${p.contact === 'NO' ? 'closes' : 'opens'} as the level lifts its float; about 10–50 W at its reed (typical): drive a relay with it, not a pump${p.form === 'cable' ? '; a tilting float on its cable, for sumps' : ''}`, box: (p) => (p.form === 'cable' ? [70, 70, 110] : p.form === 'side-mount' ? [25, 25, 85] : [30, 30, 90]), g: (p) => (p.form === 'cable' ? 300 : 40), look: 'can',
  },
  {
    id: 'limitswitch', name: 'limit switch', path: 'Electrical/Switches/Limit switches', says: 'a rugged switch worked by a machine part touching its lever or plunger', std: 'IEC 60947-5-1; EN 50041 bodies; ratings typical',
    axes: [bare('act', 'actuator', ['roller-lever', 'plunger', 'roller-plunger', 'wobble']), bare('body', 'body', ['metal', 'plastic'])],
    title: (p) => `${s(p, 'act').replace('-', ' ')} limit switch, ${p.body} body`, of: (p) => `switch-housing switch-actuator return-spring contact-spring contact-silver*4 switch-terminal*4 terminal-screw*4${p.body === 'metal' ? ' valve-body' : ''}`, make: 'assemble', how: 'a snap-action contact block, 1 NO + 1 NC, in a sealed body with its head',
    spec: (p) => `1 NO + 1 NC, positive opening (IEC 60947-5-1), about 3 A at 240 V AC-15 (typical); ${p.act === 'wobble' ? 'worked from any side' : 'worked by a cam or a stop'}`, box: (p) => [31, 30, p.act === 'roller-lever' ? 110 : 85], g: (p) => (p.body === 'metal' ? 180 : 90), look: 'case',
  },
  {
    id: 'flowsensor', name: 'water flow sensor', path: 'Electrical/Sensors/Flow sensors', says: 'a turbine with a magnet in a pipe: each turn a pulse from a Hall sensor, so many pulses a litre', std: 'the common parts by number, with their datasheet ranges and pulses per litre',
    axes: [bare('part', 'part', Object.keys(FLOW))],
    title: (p) => `${p.part} water flow sensor (${FLOW[s(p, 'part')]![0]})`, of: () => 'nylon ferrite-hard ic-package copper', make: 'assemble', how: 'a turbine on a pin in a nylon body, a magnet in its rotor, a Hall sensor outside the wall',
    spec: (p) => { const [th, range, ppl] = FLOW[s(p, 'part')]!; return `${th}, ${range} l/min; ${ppl} pulses a litre: f = ${(ppl / 60).toFixed(1)} × Q Hz, Q in l/min`; }, box: (p) => (p.part === 'YF-S401' ? [38, 25, 25] : p.part === 'FS300A' ? [66, 37, 37] : [62, 36, 35]), g: (p) => (p.part === 'YF-S401' ? 15 : 45), look: 'box',
  },
  {
    id: 'cablelug', name: 'cable lug', path: 'Electrical/Connectors/Cable lugs', says: 'a copper tube with a palm crimped on the end of a big cable, bolted to a stud', std: 'DIN 46235 sizes and the studs each is made for; tinned copper',
    axes: [unit('mm2', 'cable', 'mm²', Object.keys(LUG).map(Number)), ax('M', 'stud', '', (p) => LUG[n(p, 'mm2')]!)],
    title: (p) => `${p.mm2} mm² cable lug, M${p.M} (DIN 46235)`, of: () => 'copper tin', make: 'machine', alt: 'stamp', how: 'a copper tube with its palm pressed flat and drilled, tin-plated',
    spec: (p) => `for ${p.mm2} mm² copper cable on an M${p.M} stud; crimped with a hexagonal die of its size (DIN 46235)`, box: (p) => { const d = r1(Math.sqrt(n(p, 'mm2')) * 1.5 + 4); return [r1(d * 1.6), d, r1(d * 4)]; }, g: (p) => n(p, 'mm2') * 0.35 + 2, look: 'rod',
  },
  {
    id: 'ujoint', name: 'universal joint', path: 'Mechanical/Shafts and hubs/Universal joints', says: 'a Cardan joint: two yokes and a cross, turning a shaft through an angle', std: 'DIN 808 bores; outside diameters typical',
    axes: [ax('d', 'bore', 'mm', Object.keys(UJ).map(Number)), bare('type', 'type', ['single', 'double'])],
    title: (p) => `${p.type} universal joint, ${p.d} mm bore (DIN 808)`, of: (p) => `steel-alloy*${p.type === 'double' ? 3 : 2} steel-chrome`, make: 'machine', how: 'forged yokes and a cross on needle or plain bearings, hardened',
    spec: () => `to about 45° a joint (typical); at angle β the shaft out turns unevenly, between cos β and 1/cos β of the speed in (at 30°, 0.87 to 1.15): two joints in phase cancel it`, box: (p) => { const D = UJ[n(p, 'd')]!; return [D, D, r1(D * (p.type === 'double' ? 2.9 : 1.95))]; }, g: (p) => gOf(cyl(UJ[n(p, 'd')]!, UJ[n(p, 'd')]! * (p.type === 'double' ? 2.9 : 1.95)) * 0.6, 7.85), look: 'rod',
  },
  {
    id: 'printnozzle', name: '3D printer nozzle', path: 'Mechanical/3D printer parts/Nozzles', says: 'the brass (or hardened) tip a 3D printer extrudes through', std: 'MK8, V6 and Volcano forms, M6 thread; flows typical',
    axes: [bare('form', 'form', Object.keys(NOZZLE)), ax('d', 'orifice', 'mm', [0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.8, 1.0, 1.2]), bare('matter', 'material', ['brass', 'hardened', 'copper'])],
    title: (p) => `${p.form} nozzle ${p.d} mm, ${p.matter}`, of: (p) => (p.matter === 'hardened' ? 'steel-tool' : p.matter === 'copper' ? 'copper nickel' : 'brass'), make: 'machine', how: 'turned with its M6 thread, its cone and its orifice drilled fine, hardened or plated',
    spec: (p) => { const d = n(p, 'd'); return `M6 × 1 thread; lines about ${+(d * 1.1).toFixed(2)}–${+(d * 1.2).toFixed(2)} mm wide, layers to ${+(d * 0.75).toFixed(2)} mm; melts to about ${NOZZLE[s(p, 'form')]![0]} mm³/s (typical)${p.matter === 'hardened' ? '; for abrasive filaments' : ''}`; }, box: (p) => [7, 7, NOZZLE[s(p, 'form')]![1]], g: (p) => (p.form === 'Volcano' ? 3 : 2), look: 'screw hex',
  },
  {
    id: 'glasssheet', name: 'glass sheet', path: 'Materials/Sheet/Glass', says: 'float glass cut to size: annealed, toughened or laminated', std: 'EN 572-2 thicknesses; EN 12150 toughening; laminated 3+3 to 5+5 with 0.38 mm PVB; any size 100–3000 mm by the millimetre',
    axes: [bare('kind', 'kind', ['annealed', 'toughened', 'laminated']), ax('t', 'thickness', 'mm', (p) => (p.kind === 'laminated' ? [6.4, 8.8, 10.8] : [3, 4, 5, 6, 8, 10, 12])), ax('W', 'width', 'mm', [500, 1000], [100, 3000, 1]), ax('H', 'height', 'mm', [500, 1000], [100, 3000, 1])],
    title: (p) => `${p.t} mm ${p.kind} glass, ${p.W} × ${p.H} mm`, of: (p) => (p.kind === 'laminated' ? 'glass pvb' : 'glass'), make: (p) => (p.kind === 'annealed' ? 'cast' : p.kind === 'toughened' ? 'heat-treat' : 'laminate'), how: (p) => (p.kind === 'annealed' ? 'float glass cut to size, its edges arrised' : p.kind === 'toughened' ? 'cut and edged first, then heated to about 620 °C and quenched by air jets' : 'two sheets bonded on a PVB interlayer under heat and pressure'),
    spec: (p) => `${((n(p, 'W') * n(p, 'H') * n(p, 't') * 2.5) / 1e6).toFixed(1)} kg (2.5 kg/m² a millimetre); ${p.kind === 'toughened' ? 'bends to 120 MPa (EN 12150), breaks into small blunt pieces; cannot be cut after' : p.kind === 'laminated' ? 'holds together when broken' : 'bends to 45 MPa (EN 572), breaks into shards'}`,
    box: (p) => [n(p, 'W'), n(p, 'H'), n(p, 't')], g: (p) => gOf(n(p, 'W') * n(p, 'H') * n(p, 't'), 2.5), look: 'sheet',
  },
  {
    id: 'rebar', name: 'reinforcing bar', path: 'Materials/Building/Reinforcement', says: 'ribbed steel bar cast into concrete to carry its tension', std: 'BS 4449 B500B diameters; mass d²/162 kg/m; any length to 12 m, cut to the centimetre',
    axes: [ax('d', 'diameter', 'mm', [6, 8, 10, 12, 16, 20, 25, 32, 40]), unit('L', 'length', 'm', [6, 12], [0.1, 12, 0.01])],
    title: (p) => `${p.d} mm B500B rebar, ${p.L} m`, of: () => 'steel-low', make: 'roll', how: 'hot-rolled with its ribs and quenched at its skin (tempcore)',
    spec: (p) => { const A = (Math.PI * n(p, 'd') ** 2) / 4; return `${A.toFixed(0)} mm² (π d² / 4); yields at f_y A = ${((500 * A) / 1000).toFixed(1)} kN (500 MPa, BS 4449 B500B); ${(n(p, 'd') ** 2 / 162).toFixed(3)} kg a metre (d² / 162)`; },
    box: (p) => [r1(n(p, 'd') * 1.1), r1(n(p, 'd') * 1.1), r1(n(p, 'L') * 1000)], g: (p) => (n(p, 'd') ** 2 / 162) * n(p, 'L') * 1000, look: 'rod thread',
  },
  {
    id: 'cement', name: 'cement', path: 'Materials/Building/Binders', says: 'a 25 kg bag of cement, by its EN 197-1 type and strength class', std: 'EN 197-1 types and strength classes',
    axes: [bare('type', 'type', ['CEM-I-42.5R', 'CEM-II/A-L-32.5R', 'CEM-II/B-V-32.5N', 'CEM-III/A-42.5N'])],
    title: (p) => `${s(p, 'type').replace(/^CEM-/, 'CEM ').replace(/-(\d\d\.\d)([RN])$/, ' $1 $2')} cement, 25 kg`, of: () => 'portland paper', make: 'chemistry', how: 'limestone and clay burnt to clinker near 1450 °C, ground fine with gypsum (and limestone, fly ash or slag)',
    spec: (p) => { const [, cls, early] = s(p, 'type').match(/(\d\d\.\d)([RN])$/)!; return `at least ${cls} MPa at 28 days (EN 197-1)${early === 'R' ? '; gains strength early' : ''}; ${/II\/A-L/.test(s(p, 'type')) ? 'with limestone' : /II\/B-V/.test(s(p, 'type')) ? 'with fly ash' : /III/.test(s(p, 'type')) ? 'with blast-furnace slag: low heat, resists sulfates' : 'pure Portland'}`; },
    box: () => [450, 300, 120], g: () => 25200, look: 'box',
  },
];
