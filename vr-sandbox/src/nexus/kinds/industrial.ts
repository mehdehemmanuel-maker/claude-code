// The parts of panels, machines and plant: DIN-rail terminals, drives, PLCs, timers, meters, lamps and buzzers; the small
// parts of electronics (surge parts, optocouplers, rectifiers, supercapacitors, battery holders and protection,
// breadboards, sockets, jumpers); gearboxes, hydraulic pumps and valves, air treatment and couplings; filters and duct.
// Numbers from IEC 60947-7-1 (terminal currents), IEC 61131 (PLCs), EN 50470-3 (meter classes), IEC 60073 (colours),
// ISO 4401 (valve mountings), ISO 6150 (couplings), ISO 16890 and ASHRAE 52.2 (filters), EN 1506 (duct), and the laws
// in each (n = 120 f / p, ½CV², Q = V n, P = p Q, Q = v A); what makers sell, or a datasheet's typical, is said so.

import { ax, bare, unit, type KindDef, type P } from './core';

const n = (p: P, k: string) => Number(p[k]);
const s = (p: P, k: string) => String(p[k]);
const r1 = (x: number) => +x.toFixed(1);

/** IEC 60947-7-1 rated currents by cross-section, and the width of a feed-through terminal (mm, typical). */
const TERM: Record<number, [number, number]> = { 2.5: [24, 5.2], 4: [32, 6.2], 6: [41, 8.2], 10: [57, 10.2], 16: [76, 12.2], 35: [125, 16] };
/** Optocouplers by part: what each is for, from its datasheet, and its package. */
const OPTO: Record<string, [string, string]> = { PC817: ['transistor output, CTR 50–600 %, 5 kV isolation', 'DIP-4'], '4N35': ['transistor output, CTR ≥ 100 %, 5 kV isolation', 'DIP-6'], '6N137': ['logic output to 10 Mbit/s', 'DIP-8'], MOC3021: ['triac driver, random phase, 400 V', 'DIP-6'], MOC3041: ['triac driver, switches at zero crossing, 400 V', 'DIP-6'], TLP281: ['transistor output, CTR 50–600 %, 2.5 kV', 'SOP-4'] };
/** Bridge rectifier packages by current. */
const BRIDGE = (A: number): [string, [number, number, number], number] => (A <= 2 ? ['DB/MBS', [8, 6, 3], 0.4] : A <= 8 ? ['KBU/GBU', [22, 18, 5], 4] : A <= 25 ? ['GBJ', [30, 20, 4.6], 7] : ['KBPC', [28.6, 28.6, 10], 25]);
/** Cells a holder takes: nominal volts, and the cell's box (mm). */
const CELL: Record<string, [number, [number, number, number]]> = { AA: [1.5, [14.5, 14.5, 50.5]], AAA: [1.5, [10.5, 10.5, 44.5]], '18650': [3.6, [18.5, 18.5, 65]], '21700': [3.6, [21.5, 21.5, 70]], CR2032: [3, [20, 20, 3.2]], '9V': [9, [26.5, 17.5, 48.5]] };
/** Planetary gearboxes: rated output torque (N·m) by frame, typical. */
const PLANET: Record<number, number> = { 42: 12, 60: 40, 90: 110, 120: 270, 142: 500 };
/** Worm gearboxes (NMRV sizes): efficiency by ratio, typical. */
const wormEta = (i: number) => (i <= 7.5 ? 0.87 : i <= 15 ? 0.8 : i <= 30 ? 0.7 : i <= 50 ? 0.6 : 0.5);
/** CETOP valves: the most flow (l/min, typical) by size. */
const NG: Record<string, [number, string]> = { NG6: [60, 'ISO 4401-03 (CETOP 3)'], NG10: [120, 'ISO 4401-05 (CETOP 5)'] };
/** HVAC filter sizes, metric (mm, ISO 16890 classes) and inch (MERV, ASHRAE 52.2). */
const ISO = ['coarse-60', 'ePM10-60', 'ePM2.5-65', 'ePM1-55'], INCH = ['MERV8', 'MERV11', 'MERV13'];
const FILTERS: Record<string, [string[], [number, number, number]]> = { '592x592x48': [ISO, [592, 592, 48]], '592x287x48': [ISO, [592, 287, 48]], '20x20x1in': [INCH, [508, 508, 25]], '16x25x1in': [INCH, [406, 635, 25]], '20x25x1in': [INCH, [508, 635, 25]] };
const MERV: Record<string, string> = { MERV8: 'catches at least 70 % of 3–10 µm dust (ASHRAE 52.2)', MERV11: 'at least 65 % of 1–3 µm and 85 % of 3–10 µm (ASHRAE 52.2)', MERV13: 'at least 50 % of 0.3–1 µm, 85 % of 1–3 µm (ASHRAE 52.2)' };
/** An ISO 16890 grade said: its group and the share it catches. */
const isoSaid = (g: string) => { const [grp, pct] = g.split('-') as [string, string]; return grp === 'coarse' ? `ISO coarse ${pct} %` : `${grp} ${pct} %`; };

export const INDUSTRIAL: KindDef[] = [
  {
    id: 'dinterminal', name: 'DIN-rail terminal block', path: 'Electrical/Connectors/Terminal blocks', says: 'a screw terminal that clips onto a DIN rail: wires meet in a panel', std: 'IEC 60947-7-1 cross-sections and rated currents; widths typical',
    axes: [unit('mm2', 'conductor', 'mm²', Object.keys(TERM).map(Number)), bare('type', 'type', ['feed-through', 'earth', 'fuse', 'two-level'])],
    title: (p) => `${p.mm2} mm² ${p.type} DIN-rail terminal`, of: () => 'terminal-housing busbar terminal-clamp*2 terminal-screw*2', make: 'assemble', how: 'a brass current bar and steel screw clamps in a nylon housing that snaps onto a 35 mm rail',
    spec: (p) => `${p.mm2} mm²: rated ${TERM[n(p, 'mm2')]![0]} A (IEC 60947-7-1); ${TERM[n(p, 'mm2')]![1]} mm wide; ${p.type === 'earth' ? 'green-yellow, bonded to the rail' : p.type === 'fuse' ? 'takes a 5 × 20 mm fuse' : p.type === 'two-level' ? 'two circuits stacked in one width' : 'grey'}`,
    box: (p) => [TERM[n(p, 'mm2')]![1], 45 + n(p, 'mm2'), 42 + n(p, 'mm2') * 0.6], g: (p) => 4 + n(p, 'mm2') * 1.2, look: 'case',
  },
  {
    id: 'vfd', name: 'variable frequency drive', path: 'Electrical/Motors and actuators/Motor drives', says: 'an inverter that runs an induction motor at any speed by changing the frequency it is fed', std: 'the powers and supplies sold; motor currents typical of four-pole motors',
    axes: [bare('supply', 'supply', ['1x230V', '3x400V']), unit('kW', 'power', 'kW', (p) => (p.supply === '1x230V' ? [0.37, 0.75, 1.5, 2.2] : [0.37, 0.75, 1.5, 2.2, 4, 5.5, 7.5, 11, 15]))],
    title: (p) => `${p.kW} kW drive, ${s(p, 'supply').replace('x', ' × ').replace('V', ' V')} in`, of: () => 'pcb-bare ic-package smd-passives al-a380 pc copper', make: 'assemble', how: 'a rectifier and capacitors make DC; IGBTs switch it into a three-phase sine of any frequency, on an aluminium heatsink with a fan',
    spec: (p) => { const kW = n(p, 'kW'), I = p.supply === '1x230V' ? kW * 3.5 : kW * 2; return `drives a ${kW} kW motor at about ${r1(I)} A (${p.supply === '1x230V' ? '3 × 230 V out' : '3 × 400 V out'}, typical); 0–400 Hz out: a four-pole motor at 50 Hz turns 1500 rpm less its slip (n = 120 f / p)`; },
    box: (p) => { const k = Math.cbrt(n(p, 'kW')); return [r1(75 + k * 40), r1(150 + k * 70), r1(130 + k * 40)]; }, g: (p) => 800 + n(p, 'kW') * 400, look: 'case',
  },
  {
    id: 'plc', name: 'programmable logic controller', path: 'Electrical/Boards and controllers/PLCs', says: 'a rugged controller with digital inputs and outputs, programmed in ladder or text to run a machine', std: 'IEC 61131-2 I/O, IEC 61131-3 languages; the point counts sold',
    axes: [unit('io', 'I/O points', 'IO', [8, 14, 24, 40, 60]), bare('supply', 'supply', ['24VDC', '230VAC']), bare('out', 'outputs', ['relay', 'transistor'])],
    title: (p) => `${p.io}-point PLC, ${p.supply}, ${p.out} outputs`, of: () => 'pcb-bare ic-package smd-passives pc copper', make: 'assemble', how: 'a microcontroller, isolated 24 V inputs and relay or transistor outputs on boards in a DIN-rail case',
    spec: (p) => { const i = Math.round(n(p, 'io') * 0.6); return `${i} inputs (24 V DC, IEC 61131-2) and ${n(p, 'io') - i} ${p.out} outputs${p.out === 'relay' ? ' (2 A each, typical)' : ' (0.5 A each, fast, typical)'}; programmed in ladder, function blocks or structured text (IEC 61131-3)`; },
    box: (p) => [r1(60 + n(p, 'io') * 2.5), 90, 75], g: (p) => 250 + n(p, 'io') * 8, look: 'case',
  },
  {
    id: 'timerrelay', name: 'timer relay', path: 'Electrical/Switches/Relays', says: 'a relay that switches after a set time, or on and off in a cycle', std: 'the functions, ranges and supplies sold; 0.1 s to 100 h typical',
    axes: [bare('fn', 'function', ['on-delay', 'off-delay', 'cyclic', 'multi']), bare('supply', 'supply', ['24VAC/DC', '230VAC']), bare('contacts', 'contacts', ['1CO', '2CO'])],
    title: (p) => `${p.fn} timer relay, ${p.supply}, ${p.contacts}`, of: () => 'pc pcb-bare ic-package silver copper magnet-wire', make: 'assemble', how: 'a timing circuit set by dials driving a small relay, in a 17.5 mm DIN-rail case',
    spec: (p) => `${({ 'on-delay': 'closes the set time after it is powered', 'off-delay': 'opens the set time after its trigger goes', cyclic: 'on and off by turns, each its own time', multi: 'any of eight functions, chosen by a dial' } as Record<string, string>)[s(p, 'fn')]}; 0.1 s to 100 h; ${p.contacts === '1CO' ? 'one' : 'two'} changeover at 8 A (typical)`,
    box: (p) => [p.contacts === '1CO' ? 17.5 : 22.5, 90, 65], g: () => 70, look: 'case',
  },
  {
    id: 'energymeter', name: 'DIN-rail energy meter', path: 'Electrical/Instruments/Energy meters', says: 'a meter that counts the kilowatt-hours a circuit uses', std: 'EN 50470-3 accuracy classes (MID); the currents sold',
    axes: [bare('phases', 'phases', ['single', 'three']), unit('A', 'most current', 'A', (p) => (p.phases === 'single' ? [32, 45, 63, 80, 100] : [63, 80, 100])), bare('cls', 'class', ['B', 'C'])],
    title: (p) => `${p.phases}-phase ${p.A} A energy meter, class ${p.cls}`, of: () => 'pc pcb-bare ic-package copper brass', make: 'assemble', how: 'shunts or current transformers sensed by a metering chip, a display, brass terminals, in a DIN-rail case',
    spec: (p) => `class ${p.cls} (EN 50470-3): within ±${p.cls === 'B' ? 1 : 0.5} % of the energy; ${p.phases === 'single' ? 230 : 400} V, to ${p.A} A; kWh = ∫ P dt`, box: (p) => [p.phases === 'single' ? 36 : 72, 90, 65], g: (p) => (p.phases === 'single' ? 120 : 380), look: 'case',
  },
  {
    id: 'pilotlamp', name: '22 mm pilot lamp', path: 'Electrical/Lighting/Indicators', says: 'an LED indicator in a 22 mm panel hole', std: 'colours by IEC 60073; the supplies sold',
    axes: [bare('colour', 'colour', ['red', 'green', 'yellow', 'blue', 'white']), unit('V', 'supply', 'V', [12, 24, 110, 230])],
    title: (p) => `22 mm ${p.colour} pilot lamp, ${p.V} V`, of: () => 'pc nylon gan smd-passives brass', make: 'assemble', how: 'an LED and its resistor (or a capacitive dropper) behind a coloured lens, in a ring nut',
    spec: (p) => `${p.colour}: ${({ red: 'danger, or stopped', green: 'safe, or running', yellow: 'warning', blue: 'act now', white: 'any' } as Record<string, string>)[s(p, 'colour')]} (IEC 60073); about 20 mA at ${p.V} V (typical)`, box: () => [29, 29, 45], g: () => 25, look: 'dome',
  },
  {
    id: 'buzzer', name: 'buzzer', path: 'Electrical/Audio/Buzzers', says: 'a small sounder: a magnetic or piezo element that beeps', std: 'the types and voltages sold; loudness typical',
    axes: [bare('type', 'type', ['magnetic', 'piezo']), unit('V', 'supply', 'V', [3, 5, 12, 24]), bare('drive', 'drive', ['active', 'passive'])],
    title: (p) => `${p.V} V ${p.drive} ${p.type} buzzer`, of: () => 'buzzer-case buzzer-diaphragm coil-bobbin winding magnetic-core ring-magnet ic-package pcb-pin*2', make: 'assemble', how: (p) => (p.type === 'piezo' ? 'a piezo ceramic disc on brass in a resonant case' : 'a coil pulling a thin steel diaphragm in a resonant case'),
    spec: (p) => `${p.drive === 'active' ? 'beeps at its own tone (about 2.3 kHz) when powered' : 'sounds the frequency it is driven at'}; about 85 dB at 10 cm (typical)`, box: () => [12, 12, 9.5], g: () => 2, look: 'can',
  },
  {
    id: 'varistor', name: 'metal oxide varistor', path: 'Electrical/Circuit protection/Surge protection', says: 'a disc that conducts only above its voltage, clamping a surge off the mains', std: 'disc sizes and voltages sold; surge currents (8/20 µs) and energies typical of datasheets',
    axes: [ax('d', 'disc', 'mm', [7, 10, 14, 20]), unit('V', 'AC voltage', 'V', [130, 150, 175, 230, 250, 275, 300, 385, 420, 460])],
    title: (p) => `${p.d} mm varistor, ${p.V} V AC`, of: () => 'mov-disc lead-wire*2 dip-coat', make: 'assemble', how: 'zinc oxide grains sintered into a disc, silvered, with leads, dipped in epoxy',
    spec: (p) => { const [I, J] = ({ 7: [1.2, 17], 10: [2.5, 36], 14: [4.5, 71], 20: [8, 151] } as Record<number, [number, number]>)[n(p, 'd')]!; return `for ${p.V} V AC; takes about ${I} kA once (8/20 µs) and ${Math.round((J * n(p, 'V')) / 275)} J (typical); across the line, before a fuse`; },
    box: (p) => [n(p, 'd') + 2, 5, n(p, 'd') + 4], g: (p) => n(p, 'd') * 0.15, look: 'ring',
  },
  {
    id: 'tvsdiode', name: 'TVS diode', path: 'Electrical/Circuit protection/Surge protection', says: 'a diode that clamps a fast spike: across a line it guards', std: 'the series and stand-off voltages sold; breakdown and clamping from typical datasheets',
    axes: [bare('series', 'series', ['SMAJ', 'SMBJ', 'SMCJ', 'P6KE', '1.5KE']), unit('V', 'stand-off', 'V', [5, 6.5, 12, 15, 24, 33, 48, 58]), bare('dir', 'direction', ['uni', 'bi'])],
    title: (p) => `${p.series}${p.V}${p.dir === 'bi' ? 'CA' : 'A'} TVS diode`, of: () => 'si-die lead-frame epoxy-body', make: 'assemble', how: 'a large silicon junction in a moulded package',
    spec: (p) => { const W = ({ SMAJ: 400, SMBJ: 600, SMCJ: 1500, P6KE: 600, '1.5KE': 1500 } as Record<string, number>)[s(p, 'series')]!, V = n(p, 'V'); return `${W} W peak (10/1000 µs); stands off ${V} V, breaks down near ${r1(V * 1.11)} V, clamps near ${r1(V * 1.62)} V (typical); ${p.dir === 'bi' ? 'both ways' : 'one way'}`; },
    box: (p) => (/^SM/.test(s(p, 'series')) ? [5, 3, 2.3] : [4, 4, 9]), g: () => 0.2, look: (p) => (/^SM/.test(s(p, 'series')) ? 'chip' : 'can'),
  },
  {
    id: 'optocoupler', name: 'optocoupler', path: 'Electrical/Optoelectronics/Optocouplers', says: 'an LED and a light-sensitive switch in one package: a signal across a gap no current crosses', std: 'the common parts by number, with their datasheet ratings',
    axes: [bare('part', 'part', Object.keys(OPTO))],
    title: (p) => `${p.part} optocoupler (${OPTO[s(p, 'part')]![1]})`, of: () => 'ic-package gan silicon', make: 'assemble', how: 'an infrared LED facing a phototransistor (or a photo-triac) across clear insulation, in a moulded package',
    spec: (p) => OPTO[s(p, 'part')]![0], box: (p) => { const pkg = OPTO[s(p, 'part')]![1], pins = Number(pkg.split('-')[1]); return /SOP/.test(pkg) ? [4.4, 3.6, 2] : [6.5, r1((pins / 2) * 2.54 + 1.5), 3.5]; }, g: () => 0.3, look: 'chip',
  },
  {
    id: 'bridgerectifier', name: 'bridge rectifier', path: 'Electrical/Discrete semiconductors/Rectifiers', says: 'four diodes in one package: AC in, DC out', std: 'the currents, voltages and packages sold; forward drop typical',
    axes: [unit('A', 'current', 'A', [1, 2, 4, 6, 8, 10, 15, 25, 35, 50]), unit('V', 'reverse voltage', 'V', [100, 200, 400, 600, 800, 1000])],
    title: (p) => `${p.A} A ${p.V} V bridge rectifier (${BRIDGE(n(p, 'A'))[0]})`, of: () => 'si-die*4 lead-frame epoxy-body', make: 'assemble', how: 'four silicon diodes on copper, in a moulded (or metal-cased) block',
    spec: (p) => `${p.A} A, ${p.V} V; two diodes conduct at a time, about 2 × 1 V: ${(2 * n(p, 'A')).toFixed(0)} W lost at full current (P = 2 V_f I, typical); ${n(p, 'A') > 4 ? 'needs a heatsink' : ''}`.replace(/; $/, ''),
    box: (p) => BRIDGE(n(p, 'A'))[1], g: (p) => BRIDGE(n(p, 'A'))[2], look: 'chip',
  },
  {
    id: 'supercap', name: 'supercapacitor', path: 'Electrical/Passive components/Supercapacitors', says: 'a double-layer capacitor: far more charge than any other kind, less than a cell', std: 'the capacitances sold at 2.7 V a cell; ESR and sizes typical',
    axes: [unit('F', 'capacitance', 'F', [0.1, 1, 5, 10, 22, 50, 100, 300, 500, 3000])],
    title: (p) => `${p.F} F 2.7 V supercapacitor`, of: () => 'electrode-sheet*2 separator-film electrolyte-li cell-can-al cell-seal', make: 'wind', how: 'activated-carbon electrodes on aluminium foil, wound with a separator, soaked in electrolyte, sealed in a can',
    spec: (p) => { const C = n(p, 'F'), E = 0.5 * C * 2.7 * 2.7; return `holds ½CV² = ${E < 10 ? E.toFixed(2) : E.toFixed(0)} J (${(E / 3600).toFixed(4)} Wh) at 2.7 V; charges and discharges in seconds, for hundreds of thousands of cycles (typical)`; },
    box: (p) => { const d = r1(5 + Math.cbrt(n(p, 'F')) * 7.5); return [d, d, r1(d * 1.8)]; }, g: (p) => 0.5 + n(p, 'F') * 0.17, look: 'can',
  },
  {
    id: 'bms', name: 'battery protection board', path: 'Electrical/Power/Battery management', says: 'a board that keeps lithium cells in series from over-charge, over-discharge and short circuit, and balances them', std: 'the series counts and currents sold; cut-offs typical for Li-ion',
    axes: [unit('S', 'cells in series', 'S', [1, 2, 3, 4, 7, 10, 13, 16]), unit('A', 'current', 'A', [10, 20, 40, 60, 100])],
    title: (p) => `${p.S}S ${p.A} A Li-ion protection board`, of: () => 'pcb-bare ic-package smd-passives copper', make: 'solder', how: 'a protection chip watching each cell, MOSFETs to cut the pack off, balancing resistors',
    spec: (p) => `${p.S} cell${n(p, 'S') > 1 ? 's' : ''}: ${(n(p, 'S') * 3.6).toFixed(1)} V nominal, charged to ${(n(p, 'S') * 4.2).toFixed(1)} V; cuts off at about 4.25 V a cell over and 2.5–2.8 V under (typical); ${p.A} A continuous`, box: (p) => [r1(40 + n(p, 'S') * 4 + n(p, 'A') * 0.5), r1(20 + n(p, 'A') * 0.4), 6], g: (p) => 8 + n(p, 'A') * 0.6, look: 'board',
  },
  {
    id: 'batteryholder', name: 'battery holder', path: 'Electrical/Power/Battery holders', says: 'a moulded holder with spring contacts for cells', std: 'the cells and counts sold',
    axes: [bare('cell', 'cell', Object.keys(CELL)), ax('count', 'cells', '', (p) => (p.cell === 'CR2032' || p.cell === '9V' ? [1] : [1, 2, 3, 4, 6, 8])), bare('form', 'mount', ['pcb', 'leads'])],
    title: (p) => `${p.count} × ${p.cell} battery holder, ${p.form === 'pcb' ? 'PCB' : 'with leads'}`, of: (p) => `holder-body battery-contact*${2 * n(p, 'count')}`, make: 'mould', alt: 'print', how: 'a moulded ABS tray with nickel-plated spring contacts',
    spec: (p) => `${p.count} × ${p.cell} in series: ${(n(p, 'count') * CELL[s(p, 'cell')]![0]).toFixed(1)} V nominal`, box: (p) => { const [w, h, l] = CELL[s(p, 'cell')]![1], k = n(p, 'count'); return [r1(w * k + 4), r1(h + 3), r1(l + 8)]; }, g: (p) => 3 + n(p, 'count') * 3, look: 'case',
  },
  {
    id: 'breadboard', name: 'solderless breadboard', path: 'Electrical/Boards and controllers/Prototyping', says: 'a board of spring clips at 2.54 mm pitch: circuits built by pushing parts in', std: 'the sizes sold, by tie points',
    axes: [unit('points', 'tie points', 'pts', [170, 400, 830, 1660])],
    title: (p) => `${p.points}-point breadboard`, of: (p) => { const k = n(p, 'points') === 1660 ? 2 : 1, cols = ({ 170: 17, 400: 30, 830: 63, 1660: 63 } as Record<number, number>)[n(p, 'points')]!; return `breadboard-body${k > 1 ? '*2' : ''} clip-strip*${2 * cols * k}${n(p, 'points') >= 400 ? ` rail-clip*${4 * k}` : ''} adhesive-backing${k > 1 ? '*2' : ''}`; }, make: 'assemble', how: 'phosphor-bronze clips, a strip of five under each column\'s holes and one under each power rail, in a moulded ABS body, adhesive backed (BusBoard\'s BB400: 60 columns of five, four rails of 25)',
    spec: (p) => `${p.points} tie points at 2.54 mm (0.1 in) pitch${n(p, 'points') >= 400 ? '; power rails along both sides' : ''}`, box: (p) => ({ 170: [47, 35.5, 8.5], 400: [84, 54.3, 8.5], 830: [165, 54.3, 8.5], 1660: [165, 108.6, 8.5] } as Record<number, [number, number, number]>)[n(p, 'points')]!, g: (p) => (n(p, 'points') === 400 ? 30 : n(p, 'points') * 0.075) /* BusBoard's BB400 30 g (its listing); the others in proportion to its tie points, typical */, look: 'board',
  },
  {
    id: 'icsocket', name: 'IC socket', path: 'Electrical/Connectors/IC sockets', says: 'a socket a DIP chip plugs into, so it can be changed', std: 'the pin counts and kinds sold; 2.54 mm pitch',
    axes: [unit('pins', 'pins', 'P', [6, 8, 14, 16, 18, 20, 24, 28, 40]), bare('type', 'kind', (p) => (n(p, 'pins') >= 14 ? ['dual-wipe', 'turned-pin', 'zif'] : ['dual-wipe', 'turned-pin']))],
    title: (p) => `${p.pins}-pin ${p.type === 'zif' ? 'ZIF' : p.type} DIP socket`, of: (p) => `insulator-insert contact-socket*${n(p, 'pins')}`, make: 'assemble', how: (p) => (p.type === 'zif' ? 'a lever that opens and closes every contact at once' : 'tinned or gold-plated contacts in a moulded frame'),
    spec: (p) => `${p.pins} pins at 2.54 mm, rows ${n(p, 'pins') >= 24 ? '15.24 (or 7.62)' : '7.62'} mm apart`, box: (p) => [n(p, 'pins') >= 24 ? 17 : 10, r1((n(p, 'pins') / 2) * 2.54 + 2.5), p.type === 'zif' ? 12 : 4.5], g: (p) => n(p, 'pins') * (p.type === 'zif' ? 0.3 : 0.06), look: 'chip',
  },
  {
    id: 'jumperwire', name: 'jumper wires', path: 'Electrical/Wiring and connectors/Jumper wires', says: 'short wires with header pins or sockets on their ends, for breadboards and boards', std: 'the ends, lengths and counts sold',
    axes: [bare('ends', 'ends', ['M-M', 'M-F', 'F-F']), unit('L', 'length', 'cm', [10, 20, 30]), ax('count', 'count', '', [10, 20, 40, 65])],
    title: (p) => `${p.count} ${p.ends} jumper wires, ${p.L} cm`, of: (p) => `insulated-conductor*${n(p, 'count')} crimp-contact*${2 * n(p, 'count')} connector-housing*${2 * n(p, 'count')}`, make: 'crimp', how: 'stranded wire with crimped header pins or sockets in plastic shells',
    spec: (p) => `${p.ends === 'M-M' ? 'pin to pin' : p.ends === 'M-F' ? 'pin to socket' : 'socket to socket'}; 2.54 mm; ${p.L} cm`, box: (p) => [r1(n(p, 'L') * 10 + 30), 20, 15], g: (p) => n(p, 'count') * n(p, 'L') * 0.04, look: 'coil w1.5',
  },
  {
    id: 'planetarygearbox', name: 'planetary gearbox', path: 'Mechanical/Gears and gearboxes/Gearboxes', says: 'a sun, planets and ring in a round housing: a big ratio, coaxial, for a motor\'s flange', std: 'the frames and ratios sold; rated torques typical; about 97 % a stage',
    axes: [ax('frame', 'frame', 'mm', Object.keys(PLANET).map(Number)), ax('i', 'ratio', '', [3, 4, 5, 7, 10, 15, 20, 25, 35, 50, 70, 100])],
    title: (p) => `${p.frame} mm planetary gearbox ${p.i}:1`, of: () => 'steel-alloy*3 al-6061 {bearing 6204|steel-chrome}*2 grease', make: 'assemble', how: 'hardened gears: a sun driving planets round a ring, the planets\' carrier the output, in a machined housing',
    spec: (p) => { const st = n(p, 'i') <= 10 ? 1 : 2, eta = 0.97 ** st; return `${st} stage${st > 1 ? 's' : ''}, ${(eta * 100).toFixed(0)} % efficient (0.97 a stage, typical); rated about ${PLANET[n(p, 'frame')]} N·m out (typical); out speed and torque: n/${p.i}, T × ${p.i} × ${eta.toFixed(2)}`; },
    box: (p) => { const f = n(p, 'frame'); return [f, f, r1(f * (n(p, 'i') <= 10 ? 1.4 : 1.9))]; }, g: (p) => (n(p, 'frame') / 10) ** 3 * (n(p, 'i') <= 10 ? 6 : 8), look: 'can',
  },
  {
    id: 'wormgearbox', name: 'worm gearbox', path: 'Mechanical/Gears and gearboxes/Gearboxes', says: 'a worm turning a wheel at right angles: a large ratio in one step, often self-locking', std: 'NMRV sizes and ratios sold; efficiencies typical, falling as the ratio rises',
    axes: [bare('size', 'size', ['030', '040', '050', '063', '075', '090', '110']), ax('i', 'ratio', '', [5, 7.5, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100])],
    title: (p) => `NMRV ${p.size} worm gearbox ${p.i}:1`, of: () => 'al-a380 steel-alloy bronze {bearing 6204|steel-chrome}*2 oil', make: 'assemble', how: 'a hardened steel worm driving a bronze wheel, in a die-cast aluminium case filled with oil',
    spec: (p) => { const i = n(p, 'i'), eta = wormEta(i); return `with a 1400 rpm motor: ${(1400 / i).toFixed(0)} rpm out; about ${(eta * 100).toFixed(0)} % efficient (typical)${i >= 50 ? '; at this ratio it nearly locks: the load cannot turn it back (typical)' : ''}; centres ${Number(p.size)} mm`; },
    box: (p) => { const c = Number(p.size); return [r1(c * 2.6), r1(c * 2.6), r1(c * 2.2)]; }, g: (p) => (Number(p.size) / 10) ** 3 * 9, look: 'box',
  },
  {
    id: 'gearpump', name: 'hydraulic gear pump', path: 'Fluid/Hydraulics/Pumps', says: 'two gears meshing in a close case: oil carried round their teeth, pushed out at pressure', std: 'the displacements sold (group 1 and 2); 250 bar; efficiencies typical',
    axes: [unit('cc', 'displacement', 'cc', [1, 2, 4, 6, 8, 10, 12, 16, 20, 25])],
    title: (p) => `${p.cc} cc/rev hydraulic gear pump`, of: () => 'pump-housing gear-pump-gear*2 bushing*4 shaft-seal seal-ring*2', make: 'assemble', how: 'two hardened gears in bronze bushings in an aluminium body, a shaft seal',
    spec: (p) => { const Q = (n(p, 'cc') * 1500 * 0.93) / 1000, P = (250e5 * (Q / 60000)) / 0.85; return `at 1500 rpm: Q = V n η_v = ${Q.toFixed(2)} l/min (η_v 0.93, typical); at 250 bar it takes P = p Q / η = ${(P / 1000).toFixed(1)} kW (η 0.85, typical)`; },
    box: (p) => [80, 80, r1(70 + n(p, 'cc') * 2.2)], g: (p) => 1000 + n(p, 'cc') * 90, look: 'box',
  },
  {
    id: 'directionalvalve', name: 'hydraulic directional valve', path: 'Fluid/Hydraulics/Valves', says: 'a solenoid valve on a standard subplate that sends oil one way or the other to a cylinder or motor', std: 'ISO 4401 mounting sizes (CETOP 3 and 5); flows and pressures typical',
    axes: [bare('size', 'size', Object.keys(NG)), bare('spool', 'spool', ['4/3-closed', '4/3-tandem', '4/3-open', '4/2']), bare('coil', 'coil', ['24VDC', '230VAC'])],
    title: (p) => `${p.size} ${s(p, 'spool').replace('-', ' ')} directional valve, ${p.coil}`, of: (p) => `valve-body valve-spool solenoid-coil*${p.spool === '4/2' ? 1 : 2} return-spring*2 seal-ring*6`, make: 'assemble', how: 'a hardened spool sliding in a cast-iron body, pushed by wet-pin solenoids and centred by springs',
    spec: (p) => `${NG[s(p, 'size')]![1]}; to about ${NG[s(p, 'size')]![0]} l/min and 315 bar (typical); ${({ '4/3-closed': 'centred, every port closed: the load held', '4/3-tandem': 'centred, the pump to tank: the load held, the pump unloaded', '4/3-open': 'centred, every port to tank: the load free', '4/2': 'two positions, sprung back' } as Record<string, string>)[s(p, 'spool')]}`,
    box: (p) => (p.size === 'NG6' ? [45, 210, 90] : [70, 260, 110]), g: (p) => (p.size === 'NG6' ? 1500 : 4200), look: 'box',
  },
  {
    id: 'airprep', name: 'air preparation unit', path: 'Fluid/Pneumatics/Air preparation', says: 'a filter, regulator and lubricator for compressed air: clean, steady, oiled', std: 'the ports and units sold; flows typical at 6 bar',
    axes: [bare('port', 'port', ['G1/8', 'G1/4', 'G3/8', 'G1/2']), bare('units', 'units', ['F', 'R', 'FR', 'FRL']), ax('um', 'filter', 'µm', [5, 40])],
    title: (p) => `${p.units} unit ${p.port}, ${p.um} µm`, of: (p) => `valve-body${/F/.test(String(p.units)) ? ' filter-bowl filter-element' : ''}${/R/.test(String(p.units)) ? ' regulator-diaphragm return-spring' : ''}${/L/.test(String(p.units)) ? ' filter-bowl' : ''} seal-ring*2`, make: 'assemble', how: 'die-cast bodies with clear bowls: a sintered filter element, a diaphragm regulator with its gauge, an oil-mist lubricator',
    spec: (p) => `${({ F: 'a filter', R: 'a regulator, 0.5–10 bar', FR: 'a filter and regulator in one', FRL: 'filter, regulator and lubricator' } as Record<string, string>)[s(p, 'units')]}; filters to ${p.um} µm; about ${({ 'G1/8': 500, 'G1/4': 1000, 'G3/8': 1800, 'G1/2': 2500 } as Record<string, number>)[s(p, 'port')]} l/min at 6 bar (typical)`,
    box: (p) => [r1(40 * s(p, 'units').length), 170, 40], g: (p) => 250 * s(p, 'units').length, look: 'box',
  },
  {
    id: 'aircoupling', name: 'air quick coupling', path: 'Fluid/Pneumatics/Couplings', says: 'a coupler and plug that snap an air line on and off without tools', std: 'the profiles in use (ISO 6150 B, ARO 210, Orion) and the threads sold',
    axes: [bare('profile', 'profile', ['ISO6150-B', 'ARO210', 'Orion']), bare('part', 'part', ['coupler', 'plug']), bare('thread', 'thread', ['G1/4', 'G3/8', 'G1/2'])],
    title: (p) => `${s(p, 'profile').replace('-', ' ')} ${p.part}, ${p.thread}`, of: () => 'coupler-body coupler-sleeve locking-ball*6 return-spring*2 seal-ring', make: 'machine', how: (p) => (p.part === 'coupler' ? 'a brass body with a sprung sleeve and locking balls, a valve that shuts when unplugged' : 'a hardened plug turned to its profile'),
    spec: (p) => `${p.profile === 'ISO6150-B' ? 'the European profile (ISO 6150 B)' : p.profile === 'ARO210' ? 'the ARO 210 profile' : 'the Orion profile'}: only plugs of the same profile fit; ${p.thread}`, box: (p) => (p.part === 'coupler' ? [25, 25, 55] : [16, 16, 38]), g: (p) => (p.part === 'coupler' ? 70 : 20), look: 'rod',
  },
  {
    id: 'hvacfilter', name: 'air filter (HVAC)', path: 'Fluid/Filters/Air filters', says: 'a pleated panel filter for a ventilation system or furnace', std: 'ISO 16890 groups for metric sizes, ASHRAE 52.2 MERV for inch sizes',
    axes: [bare('size', 'size', Object.keys(FILTERS)), bare('grade', 'grade', (p) => FILTERS[s(p, 'size')]![0])],
    title: (p) => `${s(p, 'size').replace(/x/g, ' × ').replace('in', ' in')} filter, ${/^MERV/.test(s(p, 'grade')) ? s(p, 'grade').replace('MERV', 'MERV ') : isoSaid(s(p, 'grade'))}`, of: () => 'filter-media filter-frame support-mesh', make: 'assemble', how: 'pleated synthetic media in a card or galvanised frame, wire-backed',
    spec: (p) => (/^MERV/.test(s(p, 'grade')) ? MERV[s(p, 'grade')]! : `${isoSaid(s(p, 'grade'))}: catches at least that share of the particles of its size band (ISO 16890)`), box: (p) => FILTERS[s(p, 'size')]![1], g: (p) => { const [a, b] = FILTERS[s(p, 'size')]![1]; return (a * b) / 1000; }, look: 'sheet',
  },
  {
    id: 'waterfilter', name: 'water filter cartridge', path: 'Fluid/Filters/Water filters', says: 'a cartridge for a filter housing under a sink or on a supply', std: 'the housings in use (10 in standard, 10 and 20 in big) and the media sold',
    axes: [bare('size', 'size', ['10in', '10in-big', '20in-big']), bare('media', 'media', ['sediment-5um', 'sediment-20um', 'carbon-block', 'GAC'])],
    title: (p) => `${s(p, 'size').replace('in', ' in').replace('-big', ' big')} ${s(p, 'media').replace('-', ' ').replace('um', ' µm')} cartridge`, of: () => 'carbon-block filter-endcap*2', make: (p) => (/carbon/.test(s(p, 'media')) ? 'mould' : 'extrude'), how: (p) => (/sediment/.test(s(p, 'media')) ? 'polypropylene melt-blown into a depth filter' : 'activated carbon (bonded, or as granules) in a polypropylene shell'),
    spec: (p) => `${/sediment/.test(s(p, 'media')) ? `stops particles down to ${s(p, 'media').match(/\d+/)![0]} µm` : 'takes out chlorine, taste and smell'}; for a ${s(p, 'size').replace('in', ' in').replace('-big', ' big blue')} housing`, box: (p) => (p.size === '10in' ? [63, 63, 250] : p.size === '10in-big' ? [114, 114, 250] : [114, 114, 508]), g: (p) => (p.size === '10in' ? 120 : p.size === '10in-big' ? 450 : 900) * (/carbon|GAC/.test(s(p, 'media')) ? 2.5 : 1), look: 'tube',
  },
  {
    id: 'spiralduct', name: 'spiral duct', path: 'Fluid/Ducting/Spiral duct', says: 'round galvanised duct seamed in a spiral: the air ways of a building', std: 'EN 1506 diameters; any length to 3 m cut to the centimetre',
    axes: [ax('d', 'diameter', 'mm', [80, 100, 125, 150, 160, 200, 250, 315, 400, 500]), unit('L', 'length', 'm', [1, 3], [0.1, 3, 0.01])],
    title: (p) => `Ø${p.d} spiral duct, ${p.L} m`, of: () => 'steel-low zinc', make: 'roll', how: 'galvanised strip wound in a spiral and lock-seamed into a tube',
    spec: (p) => { const A = (Math.PI * (n(p, 'd') / 1000) ** 2) / 4; return `Ø${p.d} mm (EN 1506): at 4 m/s it carries Q = v A = ${(4 * A * 3600).toFixed(0)} m³/h`; }, box: (p) => [n(p, 'd'), n(p, 'd'), r1(n(p, 'L') * 1000)], g: (p) => Math.PI * n(p, 'd') * n(p, 'L') * 1000 * (n(p, 'd') <= 250 ? 0.5 : 0.6) * 7.85 / 1000, look: 'tube',
  },
];
