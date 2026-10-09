// Bought devices and the parts of cars, computers and optics: relays, mains transformers, solar panels, LED strip,
// microcontroller boards, pumps, hydraulic cylinders, spark plugs, car tyres and bulbs, SSDs and memory, prisms, fibre
// patch cords, wheels for skates, ball joints and clevises. Their numbers from ISO 6020/2 (cylinders), ISO 4000-1 and
// UN R30 (tyre sizes, speed symbols), UN R37 (bulb flux), IEC 61215 STC (solar), IEEE 802.3ae (fibre reach), DIN 71752
// and 71802 (clevises, ball joints), and from the laws in each (ρgQH, p·A, n = c/v); a range makers sell is said so.

import { ax, bare, cyl, gOf, ring, tagged, unit, type KindDef, type P } from './core';

const n = (p: P, k: string) => Number(p[k]);
const s = (p: P, k: string) => String(p[k]);
const r1 = (x: number) => +x.toFixed(1);

/** PCB relays: coil power (W) and box (mm) by contact rating, from typical datasheets. */
const relayOf = (A: number, form: string): [number, [number, number, number], number] =>
  A <= 2 ? [0.2, [20, 10, 11], 3.5] : A <= 10 ? [0.45, form === 'DPDT' ? [29, 12.7, 15.7] : [19, 15.5, 15.5], 10] : A <= 16 ? [0.53, [29, 12.7, 15.7], 12] : [0.9, [32.5, 27.5, 27.8], 32];
/** LED strips: LEDs per metre sold, voltages, watts per LED at full (typical), width (mm). */
const STRIP: Record<string, [number[], number[], number, number]> = { '2835': [[60, 120], [12, 24], 0.1, 8], '5050': [[30, 60], [12, 24], 0.24, 10], WS2812B: [[30, 60, 144], [5], 0.3, 10] };
/** Microcontroller boards by their chip: board size (mm), clock (MHz), flash, RAM, radio. */
const BOARDS: Record<string, [number, number, number, string, string, string]> = {
  'ATmega328P-Uno': [68.6, 53.4, 16, '32 KB', '2 KB', 'none'], 'ATmega328P-Nano': [45, 18, 16, '32 KB', '2 KB', 'none'], 'ATmega2560-Mega': [101.5, 53.3, 16, '256 KB', '8 KB', 'none'],
  'ESP32-WROOM-32': [55, 28, 240, '4 MB', '520 KB', 'Wi-Fi and Bluetooth'], 'ESP8266-12E': [48, 26, 80, '4 MB', '80 KB', 'Wi-Fi'], RP2040: [51, 21, 133, '2 MB', '264 KB', 'none'],
  STM32F103C8: [53, 23, 72, '64 KB', '20 KB', 'none'], nRF52840: [51, 23, 64, '1 MB', '256 KB', 'Bluetooth LE'],
};
/** Pumps: flows sold (l/min), head at that flow (m), efficiency, supply, all typical. */
const PUMPS: Record<string, [number[], number, number, string]> = { diaphragm: [[1, 2, 3.5, 5], 40, 0.3, '12 V DC'], centrifugal: [[20, 40, 60, 100], 30, 0.5, '230 V AC'], peristaltic: [[0.05, 0.1, 0.5], 10, 0.05, '12 V DC'], submersible: [[5, 10, 25, 50], 3, 0.3, '230 V AC'] };
/** ISO 6020/2 cylinders: the rods each bore takes (mm). */
const RODS: Record<number, number[]> = { 25: [12, 18], 32: [14, 22], 40: [18, 28], 50: [22, 36], 63: [28, 45], 80: [36, 56], 100: [45, 70] };
/** Spark plug threads: reaches sold (mm) and hex (mm, typical). */
const PLUG: Record<string, [number[], (r: number) => number]> = { 'M14x1.25': [[9.5, 12.7, 19, 26.5], (r) => (r <= 12.7 ? 20.8 : 16)], 'M12x1.25': [[19, 26.5], () => 14], 'M10x1': [[12.7, 19], () => 16] };
/** Speed symbols (ISO 4000-1, UN R30): km/h. */
const SPEED: Record<string, number> = { T: 190, H: 210, V: 240, W: 270, Y: 300 };
const tyreD = (w: number, ar: number, rim: number) => rim * 25.4 + (2 * w * ar) / 100;
/** Car bulbs (UN R37): base, watts, lumens, at 12 V; H4 has two filaments. */
const BULBS: Record<string, [string, string, string, [number, number, number]]> = {
  H1: ['P14.5s', '55 W', '1550 lm', [25, 25, 60]], H3: ['PK22s', '55 W', '1450 lm', [25, 25, 50]], H4: ['P43t', '60/55 W', '1650/1000 lm', [40, 40, 75]], H7: ['PX26d', '55 W', '1500 lm', [25, 25, 60]],
  H11: ['PGJ19-2', '55 W', '1350 lm', [35, 35, 60]], HB3: ['P20d', '60 W', '1860 lm', [35, 35, 65]], HB4: ['P22d', '51 W', '1095 lm', [35, 35, 65]], P21W: ['BA15s', '21 W', '460 lm', [26, 26, 48]],
  PY21W: ['BAU15s', '21 W', '280 lm (amber)', [26, 26, 48]], W5W: ['W2.1x9.5d', '5 W', '50 lm', [10, 10, 25]],
};
/** SSDs: the buses each form takes, and its board or case (mm). */
const SSD: Record<string, [string[], number, [number, number, number]]> = { '2.5in': [['SATA'], 4096, [100, 69.85, 7]], 'M.2-2280': [['SATA', 'NVMe3', 'NVMe4'], 4096, [80, 22, 2.4]], 'M.2-2242': [['SATA', 'NVMe3'], 2048, [42, 22, 2.4]], mSATA: [['SATA'], 1024, [50.8, 29.85, 4.85]] };
const BUS: Record<string, [number, string]> = { SATA: [550, 'SATA III, 6 Gb/s'], NVMe3: [3500, 'NVMe on PCIe 3.0 × 4'], NVMe4: [7000, 'NVMe on PCIe 4.0 × 4'] };
/** Memory modules: sizes, speeds (MT/s), pins (DIMM, SO-DIMM). */
const RAM: Record<string, [number[], number[], [number, number]]> = { DDR3: [[2, 4, 8], [1333, 1600], [240, 204]], DDR4: [[4, 8, 16, 32], [2400, 2666, 3200], [288, 260]], DDR5: [[8, 16, 32, 48, 64], [4800, 5600, 6000], [288, 262]] };
/** Optical glasses: index at 587.6 nm, density (g/cm³), the inventory's material. */
const GLASS: Record<string, [number, number, string]> = { 'N-BK7': [1.5168, 2.51, 'bk7'], 'fused-silica': [1.4585, 2.2, 'quartz'] };
/** Fibre: core/cladding, what it carries (IEEE 802.3ae reach for 10GBASE-SR), jacket colour (TIA-598). */
const FIBRE: Record<string, [string, string, string]> = { OS2: ['9/125 µm single-mode', '1310 and 1550 nm over many km', 'yellow'], OM3: ['50/125 µm multimode', '10 Gb/s to 300 m at 850 nm', 'aqua'], OM4: ['50/125 µm multimode', '10 Gb/s to 400 m at 850 nm', 'aqua (or violet)'] };
/** Wheels for skating: diameters, hardness (Shore A), width (mm), by use (the ranges sold). */
const WHEEL: Record<string, [number[], string[], number]> = { skate: [[50, 52, 53, 54, 56, 58, 60], ['95A', '99A', '101A'], 32], cruiser: [[60, 62, 65, 70], ['78A', '80A', '83A'], 45], inline: [[72, 76, 80, 84, 90, 100, 110], ['82A', '84A', '85A', '86A', '88A'], 24] };
/** DIN 71802 ball sockets (and DIN 71803 studs): ball (mm) by thread. */
const BALL: Record<string, number> = { M5: 8, M6: 10, M8: 13, M10: 16, M12: 19 };
/** DIN 71752 clevises: pin d × slot length g, by thread. */
const CLEVIS: Record<string, [number, number]> = { M4: [4, 8], M5: [5, 10], M6: [6, 12], M8: [8, 16], M10: [10, 20], M12: [12, 24], M14: [14, 28], M16: [16, 32], M20: [20, 40] };

export const DEVICES: KindDef[] = [
  {
    id: 'relay', name: 'PCB relay', path: 'Electrical/Switches/Relays', says: 'a switch worked by a coil: a small current at the coil switches a big one at its contacts', std: 'the coil voltages and contact ratings PCB relays are sold in; coil powers from typical datasheets',
    axes: [unit('V', 'coil', 'V', [3, 5, 12, 24]), bare('form', 'contacts', ['SPDT', 'DPDT']), unit('A', 'contact rating', 'A', (p) => (p.form === 'SPDT' ? [2, 5, 10, 16, 30] : [1, 2, 5, 8]))],
    title: (p) => `${p.V} V relay, ${p.form}, ${p.A} A`, of: (p) => `coil-bobbin winding magnetic-core armature contact-spring*${p.form === 'DPDT' ? 2 : 1} contact-silver*${p.form === 'DPDT' ? 6 : 3} return-spring relay-cover switch-housing pcb-pin*${p.form === 'DPDT' ? 8 : 5}`, make: 'assemble', how: 'a coil on an iron core pulls an armature that moves springy contacts tipped with silver alloy, in a sealed case',
    spec: (p) => { const [P] = relayOf(n(p, 'A'), s(p, 'form')), V = n(p, 'V'); return `coil ${V} V: about ${((P / V) * 1000).toFixed(0)} mA, ${((V * V) / P).toFixed(0)} Ω (${P} W, typical); contacts ${p.form === 'SPDT' ? 'one changeover' : 'two changeovers'} at ${p.A} A, 250 V AC; put a diode across its coil when a transistor drives it`; },
    box: (p) => relayOf(n(p, 'A'), s(p, 'form'))[1], g: (p) => relayOf(n(p, 'A'), s(p, 'form'))[2], look: 'case',
  },
  {
    id: 'transformer', name: 'mains transformer', path: 'Electrical/Power/Transformers', says: 'two windings on an iron core: mains in, a lower voltage out, isolated from the mains', std: 'the VA ratings and secondaries sold, 230 V primary (EN 61558); masses an estimate',
    axes: [bare('core', 'core', ['EI', 'toroidal']), unit('VA', 'rating', 'VA', (p) => (p.core === 'EI' ? [1.5, 3, 5, 10, 20, 30, 50, 100] : [15, 30, 50, 80, 120, 160, 225, 300, 500])), unit('V', 'secondary', 'V', [6, 9, 12, 15, 18, 24, 30])],
    title: (p) => `${p.VA} VA ${p.core} transformer, 230 V to ${p.V} V`, of: (p) => `steel-electrical magnet-wire*2 ${p.core === 'EI' ? 'pbt' : 'pet'} steel-low`, make: 'wind', how: (p) => (p.core === 'EI' ? 'two windings on a plastic bobbin over stacked E and I laminations' : 'two windings wound round a ring of coiled silicon-steel strip, taped between'),
    spec: (p) => `${p.V} V at ${(n(p, 'VA') / n(p, 'V')).toFixed(2)} A (I = VA / V); turns ratio ${(230 / n(p, 'V')).toFixed(1)} : 1 (N₁/N₂ = V₁/V₂)${p.core === 'toroidal' ? '; little stray field, quiet' : ''}`,
    box: (p) => { const g = (p.core === 'EI' ? 50 : 30) * n(p, 'VA') ** 0.8, side = Math.cbrt(g / 5) * 10, D = Math.cbrt(g / 5 / 0.45) * 10; return p.core === 'EI' ? [r1(side * 1.2), r1(side), r1(side * 0.85)] : [r1(D), r1(D), r1(D * 0.45)]; }, g: (p) => (p.core === 'EI' ? 50 : 30) * n(p, 'VA') ** 0.8, look: (p) => (p.core === 'EI' ? 'box' : 'ring'),
  },
  {
    id: 'solarpanel', name: 'solar panel', path: 'Electrical/Power/Solar', says: 'silicon cells under glass in an aluminium frame: sunlight to direct current', std: 'the powers sold; cell counts and voltages of 12 V and grid panels (typical); ratings at STC, 1000 W/m² and 25 °C (IEC 61215)',
    axes: [unit('W', 'power', 'W', [5, 10, 20, 30, 50, 100, 150, 200, 300, 400, 450]), bare('cell', 'cells', ['mono', 'poly'])],
    title: (p) => `${p.W} W ${p.cell === 'mono' ? 'monocrystalline' : 'polycrystalline'} solar panel`, of: () => 'glass silicon al-6063 eva pet copper silver-paste', make: 'laminate', how: 'silicon cells strung with tinned copper ribbon, laminated in EVA between glass and a back sheet, framed in aluminium, a junction box behind',
    spec: (p) => { const W = n(p, 'W'), c = W <= 200 ? 36 : W <= 330 ? 60 : 72, Vmp = c * 0.53, eff = p.cell === 'mono' ? 0.2 : 0.17; return `${c} cells (typical): about ${Vmp.toFixed(1)} V and ${(W / Vmp).toFixed(2)} A at full power, ${(c * 0.62).toFixed(1)} V open circuit, at STC; about ${eff * 100} % efficient, so ${(W / (1000 * eff)).toFixed(2)} m² (area = P / (1000 W/m² × η))`; },
    box: (p) => { const a = n(p, 'W') / (1000 * (p.cell === 'mono' ? 0.2 : 0.17)), L = Math.sqrt(a * 1.9) * 1000; return [r1(L), r1((a * 1e6) / L), n(p, 'W') >= 50 ? 30 : 17]; }, g: (p) => (n(p, 'W') / (1000 * (p.cell === 'mono' ? 0.2 : 0.17))) * 11000, look: 'sheet',
  },
  {
    id: 'ledstrip', name: 'LED strip', path: 'Electrical/Lighting/LED strip', says: 'LEDs on a flexible copper-clad tape, cut between its marks', std: 'the chips, densities and voltages sold; watts per LED at full brightness typical',
    axes: [bare('chip', 'LED', Object.keys(STRIP)), unit('perm', 'LEDs per metre', '/m', (p) => STRIP[s(p, 'chip')]![0]), unit('V', 'supply', 'V', (p) => STRIP[s(p, 'chip')]![1]), unit('L', 'length', 'm', [0.5, 1, 2, 3, 5, 10])],
    title: (p) => `${p.chip} LED strip, ${p.perm} LEDs/m, ${p.V} V, ${p.L} m`, of: (p) => `polyimide copper gan yag-phosphor glue${p.chip === 'WS2812B' ? ' si-die' : ' smd-passives'}`, make: 'solder', how: (p) => (p.chip === 'WS2812B' ? 'addressable LEDs, each with its own driver chip, reflowed onto flexible copper-clad tape' : 'LEDs and their resistors reflowed onto flexible copper-clad tape, an adhesive back'),
    spec: (p) => { const Wm = n(p, 'perm') * STRIP[s(p, 'chip')]![2], W = Wm * n(p, 'L'); return `about ${Wm.toFixed(1)} W per metre at full (typical): ${W.toFixed(1)} W and ${(W / n(p, 'V')).toFixed(2)} A for ${p.L} m at ${p.V} V (I = P / V)${p.chip === 'WS2812B' ? '; each LED set by one data line' : ''}`; },
    box: (p) => (n(p, 'L') >= 2 ? [150, 150, 14] : [n(p, 'L') * 1000, STRIP[s(p, 'chip')]![3], 3]), g: (p) => n(p, 'L') * 18, look: (p) => (n(p, 'L') >= 2 ? `coil w${STRIP[s(p, 'chip')]![3]}` : 'sheet'),
  },
  {
    id: 'devboard', name: 'microcontroller board', path: 'Electrical/Boards and controllers/Microcontroller boards', says: 'a microcontroller on a board with its regulator, clock and USB, ready to program', std: 'the common boards by chip and form, with their datasheet clocks and memory',
    axes: [bare('board', 'board', Object.keys(BOARDS))],
    title: (p) => `${s(p, 'board').replace('-', ' ')} microcontroller board`, of: () => 'pcb-bare ic-package pin-header smd-passives', make: 'solder', how: 'its chip, crystal, regulator and USB parts reflowed onto a small board, pin headers along its edges',
    spec: (p) => { const [, , MHz, fl, ram, radio] = BOARDS[s(p, 'board')]!; return `${MHz} MHz, ${fl} flash, ${ram} RAM; radio: ${radio}`; },
    box: (p) => [BOARDS[s(p, 'board')]![0], 12, BOARDS[s(p, 'board')]![1]], g: (p) => BOARDS[s(p, 'board')]![0] * BOARDS[s(p, 'board')]![1] * 0.006, look: 'board',
  },
  {
    id: 'pump', name: 'water pump', path: 'Fluid/Pumps/Water pumps', says: 'a pump that moves water: lifting it by its head, at its flow', std: 'the flows sold by type; heads and efficiencies typical; the power is ρgQH',
    axes: [bare('type', 'type', Object.keys(PUMPS)), unit('Q', 'flow', 'l/min', (p) => PUMPS[s(p, 'type')]![0])],
    title: (p) => `${p.type} pump, ${p.Q} l/min`, of: () => 'pump-head diaphragm valve-flap*2 coil-bobbin winding magnetic-core ring-magnet return-spring', make: 'assemble', how: (p) => ({ diaphragm: 'a motor rocks a rubber diaphragm over check valves', centrifugal: 'a motor spins an impeller that flings water outward in a volute', peristaltic: 'rollers squeeze a soft tube along: the liquid never touches the pump', submersible: 'a sealed motor spins a small impeller under the water' } as Record<string, string>)[s(p, 'type')]!,
    spec: (p) => { const [, H, eta, sup] = PUMPS[s(p, 'type')]!, Q = n(p, 'Q') / 60000, P = 1000 * 9.81 * Q * H; return `${p.Q} l/min against about ${H} m of head (typical); water power ρgQH = ${P.toFixed(1)} W, so it draws about ${(P / eta).toFixed(0)} W at about ${eta * 100} % efficiency (typical); ${sup}`; },
    box: (p) => { const [, H, eta] = PUMPS[s(p, 'type')]!, Pin = (1000 * 9.81 * (n(p, 'Q') / 60000) * H) / eta, side = Math.cbrt((200 + Pin * 8) / 1.5) * 10; return [r1(side * 1.3), r1(side), r1(side)]; },
    g: (p) => { const [, H, eta] = PUMPS[s(p, 'type')]!; return 200 + ((1000 * 9.81 * (n(p, 'Q') / 60000) * H) / eta) * 8; }, look: 'motor',
  },
  {
    id: 'hydrauliccylinder', name: 'hydraulic cylinder', path: 'Fluid/Hydraulics/Cylinders', says: 'oil under pressure pushes a piston and its rod out, and back', std: 'ISO 6020/2 bores and rods at 160 bar; any stroke 10–1500 mm',
    axes: [ax('D', 'bore', 'mm', Object.keys(RODS).map(Number)), ax('d', 'rod', 'mm', (p) => RODS[n(p, 'D')]!), unit('L', 'stroke', 'mm', [50, 100, 150, 200, 250, 300, 400, 500], [10, 1500, 1])],
    title: (p) => `hydraulic cylinder ${p.D}/${p.d} × ${p.L} mm`, of: () => 'cylinder-barrel piston-rod cylinder-piston cylinder-gland cylinder-cap rod-seal piston-seal wiper-seal seal-ring*2 oil', make: 'assemble', how: 'a honed steel barrel, a piston with its seals on a hard-chromed rod, end caps tied or welded on',
    spec: (p) => { const D = n(p, 'D') / 1000, d = n(p, 'd') / 1000, pa = 16e6; return `at 160 bar (ISO 6020/2): pushes ${((pa * Math.PI * D * D) / 4 / 1000).toFixed(1)} kN, pulls ${((pa * Math.PI * (D * D - d * d)) / 4 / 1000).toFixed(1)} kN (F = p·A); ${(((Math.PI * D * D) / 4) * n(p, 'L')).toFixed(2)} l of oil to push it out (A × stroke)`; },
    box: (p) => [n(p, 'D') * 1.6, n(p, 'D') * 1.6, n(p, 'L') + n(p, 'D') * 2.5 + 40], g: (p) => { const D = n(p, 'D'), L = n(p, 'L') + D * 1.5; return gOf(ring(D * 1.24, D, L) + cyl(n(p, 'd'), L) + 2 * (1.6 * D) ** 2 * 0.6 * D, 7.85); }, look: 'can',
  },
  {
    id: 'sparkplug', name: 'spark plug', path: 'Mechanical/Vehicle parts/Engine parts', says: 'the plug that sparks a petrol engine\'s mixture: a centre electrode in a ceramic insulator in a threaded shell', std: 'the threads and reaches in use; hex sizes typical',
    axes: [bare('thread', 'thread', Object.keys(PLUG)), ax('reach', 'reach', 'mm', (p) => PLUG[s(p, 'thread')]![0]), bare('tip', 'centre electrode', ['nickel', 'platinum'])],
    title: (p) => `spark plug ${p.thread}, ${p.reach} mm reach, ${p.tip}`, of: () => 'spark-plug-shell spark-plug-insulator centre-electrode ground-electrode terminal-stud sealing-washer glass', make: 'assemble', how: 'a copper-cored centre electrode sealed through an alumina insulator, crimped into a steel shell with its ground electrode welded on',
    spec: (p) => `${p.thread} thread, ${p.reach} mm reach, ${PLUG[s(p, 'thread')]![1](n(p, 'reach'))} mm hex; gap about 0.7–1.1 mm (typical); ${p.tip === 'platinum' ? 'a platinum tip wears slowly' : 'a nickel tip'}`,
    box: (p) => { const h = PLUG[s(p, 'thread')]![1](n(p, 'reach')); return [r1(h * 1.15), r1(h * 1.15), r1(n(p, 'reach') + 55)]; }, g: (p) => 35 + n(p, 'reach') * 0.6, look: 'screw hex',
  },
  {
    id: 'cartyre', name: 'car tyre', path: 'Mechanical/Vehicle parts/Wheels', says: 'a passenger car tyre by its ISO metric size: width, aspect ratio and rim, and its speed symbol', std: 'ISO 4000-1 sizes (the passenger range: which aspect ratios go with each width and which rims with each, an estimate) and UN R30 speed symbols',
    axes: [ax('w', 'section width', 'mm', [155, 165, 175, 185, 195, 205, 215, 225, 235, 245, 255, 265, 275]), ax('ar', 'aspect ratio', '%', (p) => [35, 40, 45, 50, 55, 60, 65, 70, 75, 80].filter((ar) => ar >= 60 - (n(p, 'w') - 155) * 0.3 && ar <= 80 - (n(p, 'w') - 155) * 0.25)),
      tagged('rim', 'R', 'rim', 'in', (p) => [13, 14, 15, 16, 17, 18, 19, 20, 21, 22].filter((r) => { const w = n(p, 'w'), ar = n(p, 'ar'), D = tyreD(w, ar, r); return r >= 12 + (w - 150) / 25 && ar >= Math.max(35, 65 - (r - 13) * 6) && ar <= Math.min(80, 85 - (r - 13) * 4) && D >= 540 && D <= 800; })),
      bare('speed', 'speed symbol', Object.keys(SPEED))],
    title: (p) => `${p.w}/${p.ar} R${p.rim} car tyre, speed ${p.speed}`, of: () => 'rubber graphite steel-spring pet nylon', make: 'mould', how: 'rubber with carbon black over a polyester carcass, steel cord belts and a nylon cap ply, beads of steel wire, vulcanised in its tread mould',
    spec: (p) => { const w = n(p, 'w'), D = tyreD(w, n(p, 'ar'), n(p, 'rim')); return `${w} mm wide, ${((w * n(p, 'ar')) / 100).toFixed(0)} mm sidewall, about ${D.toFixed(0)} mm across (rim × 25.4 + 2 × width × ratio); ${(1e6 / (Math.PI * D)).toFixed(0)} turns per km; speed ${p.speed}: to ${SPEED[s(p, 'speed')]} km/h`; },
    box: (p) => { const D = r1(tyreD(n(p, 'w'), n(p, 'ar'), n(p, 'rim'))); return [D, D, n(p, 'w')]; }, g: (p) => n(p, 'w') * tyreD(n(p, 'w'), n(p, 'ar'), n(p, 'rim')) * 0.07, look: 'torus',
  },
  {
    id: 'autobulb', name: 'car bulb', path: 'Mechanical/Vehicle parts/Lighting', says: 'a halogen headlamp bulb or a signal bulb, by its UN R37 category', std: 'UN R37 categories with their watts and lumens at 12 V',
    axes: [bare('type', 'category', Object.keys(BULBS))],
    title: (p) => `${p.type} 12 V car bulb (${BULBS[s(p, 'type')]![1]})`, of: () => 'bulb-envelope filament*2 bulb-base', make: 'assemble', how: (p) => (/^H/.test(s(p, 'type')) ? 'a tungsten filament in a quartz capsule filled with halogen gas, on its keyed base' : 'a tungsten filament in a glass bulb on its base'),
    spec: (p) => { const [base, W, lm] = BULBS[s(p, 'type')]!; return `${W}, ${lm} at 13.2 V (UN R37); base ${base}`; }, box: (p) => BULBS[s(p, 'type')]![3], g: (p) => (s(p, 'type') === 'W5W' ? 1 : 12), look: 'dome',
  },
  {
    id: 'ssd', name: 'solid-state drive', path: 'Electrical/Computer parts/Storage', says: 'flash memory and a controller on a board: a drive with no moving parts', std: 'the forms and buses in use; capacities sold; sequential reads typical for each bus',
    axes: [bare('form', 'form', Object.keys(SSD)), bare('bus', 'bus', (p) => SSD[s(p, 'form')]![0]), unit('GB', 'capacity', 'GB', (p) => [128, 256, 512, 1024, 2048, 4096].filter((g) => g <= SSD[s(p, 'form')]![1]))],
    title: (p) => `${n(p, 'GB') >= 1024 ? `${n(p, 'GB') / 1024} TB` : `${p.GB} GB`} ${p.form} SSD, ${p.bus}`, of: (p) => `pcb-bare si-die*${n(p, 'GB') >= 1024 ? 4 : 2} smd-passives${p.form === '2.5in' ? ' al-a380' : ''}`, make: 'assemble', how: 'NAND flash, a controller and (often) DRAM reflowed onto a board, in a case or bare for an M.2 slot',
    spec: (p) => { const [r, b] = BUS[s(p, 'bus')]!; return `${b}: reads up to about ${r} MB/s (typical); ${SSD[s(p, 'form')]![2].join(' × ')} mm`; }, box: (p) => SSD[s(p, 'form')]![2], g: (p) => (p.form === '2.5in' ? 50 : 8), look: (p) => (p.form === '2.5in' ? 'case' : 'board'),
  },
  {
    id: 'ram', name: 'memory module', path: 'Electrical/Computer parts/Memory', says: 'DRAM chips on a module that plugs into a computer', std: 'JEDEC generations, the sizes and speeds sold',
    axes: [bare('gen', 'generation', Object.keys(RAM)), bare('form', 'form', ['DIMM', 'SODIMM']), unit('GB', 'size', 'GB', (p) => RAM[s(p, 'gen')]![0]), unit('MT', 'speed', 'MT/s', (p) => RAM[s(p, 'gen')]![1])],
    title: (p) => `${p.GB} GB ${p.gen}-${p.MT} ${p.form}`, of: () => 'pcb-bare si-die*8 smd-passives gold', make: 'assemble', how: 'DRAM chips reflowed onto a multilayer board with gold-plated edge contacts',
    spec: (p) => `${p.MT} MT/s × 8 bytes = ${((n(p, 'MT') * 8) / 1000).toFixed(1)} GB/s a module; ${RAM[s(p, 'gen')]![2][p.form === 'DIMM' ? 0 : 1]} pins`, box: (p) => (p.form === 'DIMM' ? [133.35, 31.25, 3] : [69.6, 30, 3]), g: (p) => (p.form === 'DIMM' ? 15 : 8), look: 'board',
  },
  {
    id: 'prism', name: 'optical prism', path: 'Optics/Prisms', says: 'a block of optical glass that turns, flips or splits light', std: 'the common forms and face sizes sold; glass indices at 587.6 nm',
    axes: [bare('type', 'form', ['rightangle', 'penta', 'dove', 'equilateral']), ax('a', 'face', 'mm', [5, 10, 12.7, 15, 20, 25, 30, 50]), bare('glass', 'glass', Object.keys(GLASS))],
    title: (p) => `${({ rightangle: 'right-angle', penta: 'penta', dove: 'Dove', equilateral: 'equilateral' } as Record<string, string>)[s(p, 'type')]} prism ${p.a} mm, ${p.glass === 'fused-silica' ? 'fused silica' : p.glass}`, of: (p) => GLASS[s(p, 'glass')]![2], make: 'machine', how: 'optical glass ground and polished flat to a fraction of a wavelength',
    spec: (p) => { const nn = GLASS[s(p, 'glass')]![0], crit = (Math.asin(1 / nn) * 180) / Math.PI; return ({ rightangle: `turns a beam 90° by total internal reflection (critical angle asin(1/n) = ${crit.toFixed(1)}°), or sends it back off its hypotenuse`, penta: 'turns a beam 90° whatever angle it comes in at, the image not mirrored', dove: 'turned about its length, turns the image twice as far', equilateral: `spreads white light into colours: minimum deviation 2·asin(n·sin 30°) − 60° = ${((2 * Math.asin(nn * 0.5) * 180) / Math.PI - 60).toFixed(1)}° at 587.6 nm` } as Record<string, string>)[s(p, 'type')]! + ` (n = ${nn})`; },
    box: (p) => { const a = n(p, 'a'); return p.type === 'dove' ? [r1(a * 4.23), a, a] : [a, a, a]; }, g: (p) => { const a = n(p, 'a'), v = ({ rightangle: 0.5, penta: 1.3, dove: 4.23 * 0.75, equilateral: Math.sqrt(3) / 4 } as Record<string, number>)[s(p, 'type')]! * a ** 3; return gOf(v, GLASS[s(p, 'glass')]![1]); }, look: 'box',
  },
  {
    id: 'fibrepatch', name: 'fibre patch cord', path: 'Electrical/Wiring and connectors/Fibre optic', says: 'optical fibre with a connector on each end, for networks', std: 'ISO/IEC 11801 fibre classes; reaches from IEEE 802.3ae; jacket colours TIA-598',
    axes: [bare('mode', 'fibre', Object.keys(FIBRE)), bare('ends', 'connectors', ['LC-LC', 'SC-SC', 'LC-SC']), bare('lanes', 'fibres', ['simplex', 'duplex']), unit('L', 'length', 'm', [0.5, 1, 2, 3, 5, 10, 15, 20, 30, 50])],
    title: (p) => `${p.mode} ${p.ends} ${p.lanes} fibre patch cord, ${p.L} m`, of: () => 'optical-fibre tight-buffer strength-yarn cable-jacket fibre-connector*2 boot*2', make: 'assemble', how: 'a glass fibre in a buffered, jacketed cord, its ends glued into ceramic ferrules and polished',
    spec: (p) => { const [core, carries, col] = FIBRE[s(p, 'mode')]!; return `${core}: ${carries}; ${col} jacket`; }, box: (p) => (n(p, 'L') >= 2 ? [120, 120, 20] : [n(p, 'L') * 1000, 6, 6]), g: (p) => n(p, 'L') * 6 * (p.lanes === 'duplex' ? 2 : 1) + 10, look: (p) => `coil w${p.lanes === 'duplex' ? 4 : 2}`,
  },
  {
    id: 'skatewheel', name: 'skate wheel', path: 'Mechanical/Wheels/Skate wheels', says: 'a cast polyurethane wheel for a skateboard, cruiser or inline skate, on two 608 bearings', std: 'the sizes and hardnesses sold for each (Shore A, ASTM D2240)',
    axes: [bare('use', 'for', Object.keys(WHEEL)), ax('d', 'diameter', 'mm', (p) => WHEEL[s(p, 'use')]![0]), bare('duro', 'hardness', (p) => WHEEL[s(p, 'use')]![1])],
    title: (p) => `${p.d} mm ${p.duro} ${p.use} wheel`, of: (p) => `pu${p.use === 'skate' ? '' : ' nylon'}`, make: 'cast', how: (p) => (p.use === 'skate' ? 'polyurethane cast solid round its bearing seats' : 'polyurethane cast round a nylon hub'),
    spec: (p) => `${p.d} mm, ${p.duro} (Shore A): ${parseInt(s(p, 'duro'), 10) >= 95 ? 'hard, fast on smooth ground, slides' : 'softer, grips and rolls over rough ground'}; takes two 608 bearings (8 mm axle)`,
    box: (p) => [n(p, 'd'), n(p, 'd'), WHEEL[s(p, 'use')]![2]], g: (p) => gOf(ring(n(p, 'd'), 22, WHEEL[s(p, 'use')]![2]) * 0.85, 1.2), look: 'ring',
  },
  {
    id: 'balljoint', name: 'ball joint', path: 'Mechanical/Linkages/Ball joints', says: 'a ball in a socket: a linkage end that swivels every way', std: 'DIN 71802 sockets and DIN 71803 ball studs, M5–M12',
    axes: [bare('form', 'part', ['socket', 'stud']), bare('thread', 'thread', Object.keys(BALL)), bare('matter', 'material', ['zinc', 'A2'])],
    title: (p) => `ball ${p.form === 'socket' ? 'socket DIN 71802' : 'stud DIN 71803'} ${BALL[s(p, 'thread')]} ${p.thread}, ${p.matter === 'A2' ? 'stainless' : 'zinc-plated'}`, of: (p) => (p.matter === 'A2' ? 'stainless-304' : 'steel-low zinc') + (p.form === 'socket' ? ' steel-spring' : ''), make: 'machine', how: (p) => (p.form === 'socket' ? 'a turned body with a spherical seat, threaded, a spring clip to hold the ball' : 'a turned stud with its ball and thread'),
    spec: (p) => `${BALL[s(p, 'thread')]} mm ball, ${p.thread} thread; ${p.form === 'socket' ? 'its clip keeps the ball in' : 'mates the DIN 71802 socket'}`,
    box: (p) => { const b = BALL[s(p, 'thread')]!; return p.form === 'socket' ? [b * 1.8, b * 1.5, b * 3] : [b, b, b * 2.5]; }, g: (p) => { const b = BALL[s(p, 'thread')]!; return gOf(cyl(b * 1.4, b * 2.4), 7.85) * (p.form === 'socket' ? 0.8 : 0.5); }, look: 'rod',
  },
  {
    id: 'clevis', name: 'clevis', path: 'Mechanical/Linkages/Clevises', says: 'a threaded fork with a pin across it: the end of a rod or a cylinder that pivots one way', std: 'DIN 71752, M4–M20',
    axes: [bare('thread', 'thread', Object.keys(CLEVIS)), bare('matter', 'material', ['zinc', 'A2'])],
    title: (p) => { const [d, g] = CLEVIS[s(p, 'thread')]!; return `clevis DIN 71752 G ${d}x${g} (${p.thread}), ${p.matter === 'A2' ? 'stainless' : 'zinc-plated'}`; }, of: (p) => (p.matter === 'A2' ? 'stainless-304*2' : 'steel-low*2 zinc'), make: 'machine', how: 'a fork turned and milled from bar, threaded, with its pin and spring clip',
    spec: (p) => { const [d, g] = CLEVIS[s(p, 'thread')]!; return `${d} mm pin across a ${d} mm slot ${g} mm deep; about ${r1(d * 5.25)} mm long (typical)`; }, box: (p) => { const d = CLEVIS[s(p, 'thread')]![0]; return [d * 2, d * 2, r1(d * 5.25)]; }, g: (p) => { const d = CLEVIS[s(p, 'thread')]![0]; return gOf(cyl(d * 2, d * 5.25) * 0.55, 7.85); }, look: 'rod',
  },
];
