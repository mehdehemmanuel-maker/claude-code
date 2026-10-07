// More bought parts: the other rolling bearings, mains motors by frame, the electrics of a panel (breakers, RCDs,
// contactors, push buttons, conduit), ribbed belts, the connectors of sound and radio, speakers, microphones and
// antennas, hydraulic hose, pneumatic valves, plumbing in plastic and copper, building screws, bicycle tyres, memory
// cards and sensor modules. From ISO 355 and ISO 15 (bearings), IEC 60072 (motor frames), IEC 60898-1 and 61008
// (breakers, RCDs), IEC 60947 (contactors, buttons), ISO 9982 (ribbed belts), SAE J517 (hose), EN 1254 (fittings),
// ETRTO (tyres); parts named by their makers' numbers carry those numbers' datasheet ratings.

import { ax, bare, cyl, gOf, ring, unit, type KindDef, type P } from './core';

const n = (p: P, k: string) => Number(p[k]);
const s = (p: P, k: string) => String(p[k]);
/** ISO 355 tapered roller bearings, 302 series: bore, outside, width T. */
const T302: Record<string, [number, number, number]> = { '30202': [15, 35, 11.75], '30203': [17, 40, 13.25], '30204': [20, 47, 15.25], '30205': [25, 52, 16.25], '30206': [30, 62, 17.25], '30207': [35, 72, 18.25], '30208': [40, 80, 19.75], '30209': [45, 85, 20.75], '30210': [50, 90, 21.75] };
/** The 72, 12 and 222 series by their last two digits: bore, outside, width (ISO 15). */
const SER2: Record<string, [number, number, number]> = { '00': [10, 30, 9], '01': [12, 32, 10], '02': [15, 35, 11], '03': [17, 40, 12], '04': [20, 47, 14], '05': [25, 52, 15], '06': [30, 62, 16], '07': [35, 72, 17], '08': [40, 80, 18], '09': [45, 85, 19], '10': [50, 90, 20] };
const ser2 = (p: P) => SER2[s(p, 'number').slice(2)]!;
const SPH: Record<string, [number, number, number]> = { '22205': [25, 52, 18], '22206': [30, 62, 20], '22207': [35, 72, 23], '22208': [40, 80, 23], '22209': [45, 85, 23], '22210': [50, 90, 23] };
/** IEC 60072 frames with the four-pole powers each is built for (kW), and its shaft diameter (mm). */
const IEC: Record<string, [number[], number]> = { '56': [[0.06, 0.09], 9], '63': [[0.12, 0.18], 11], '71': [[0.25, 0.37], 14], '80': [[0.55, 0.75], 19], '90S': [[1.1], 24], '90L': [[1.5], 24], '100L': [[2.2, 3], 28], '112M': [[4], 28], '132S': [[5.5], 38], '132M': [[7.5], 38] };
/** ISO 9982 ribbed (poly-V) belts: rib pitch, height (mm). */
const PV: Record<string, [number, number]> = { PH: [1.6, 3], PJ: [2.34, 4], PK: [3.56, 6], PL: [4.7, 10], PM: [9.4, 17] };
/** SAE J517 100R2AT hose: bore (mm) and working pressure (bar). */
const R2: Record<string, [number, number]> = { '-4': [6.4, 400], '-6': [9.5, 330], '-8': [12.7, 275], '-10': [15.9, 250], '-12': [19, 215], '-16': [25.4, 165] };
/** ETRTO bead seats and what they are called. */
const BEAD: Record<number, string> = { 559: '26"', 584: '27.5" (650b)', 622: '700c / 29"' };
/** Sensor modules by name: what each senses, its range or accuracy (datasheet), its board. */
const MODULES: Record<string, [string, string, number, number]> = {
  'HC-SR04': ['ultrasonic distance', '2–400 cm, ±3 mm', 45, 20], 'HC-SR501': ['passive infrared motion', 'to about 7 m, 110° cone', 32, 24], DHT22: ['temperature and humidity', '−40 to 80 °C ±0.5 °C, 0–100 % RH ±2 %', 15, 25],
  DS18B20: ['waterproof temperature probe', '−55 to 125 °C, ±0.5 °C from −10 to 85 °C', 6, 50], 'INA219-board': ['current and power over I²C', '±3.2 A, 0–26 V', 25, 22], 'BH1750': ['light level', '1–65 535 lx', 19, 14],
  'MAX30102': ['pulse and blood oxygen', 'red and infrared reflectance', 14, 14], 'GY-271': ['three-axis compass', '±8 gauss', 14, 13], 'NEO-6M': ['GPS', '2.5 m CEP, 1 Hz', 36, 26], 'MQ-2': ['combustible gas and smoke', '300–10 000 ppm', 32, 20],
  'SW-420': ['vibration switch', 'on/off', 32, 14], 'TCRT5000': ['reflective infrared', '1–8 mm (best at 2.5 mm)', 32, 14], 'ACS712-20A': ['Hall current sensor', '±20 A, 100 mV/A', 31, 13], 'VL6180X': ['time-of-flight distance', '0–100 mm', 13, 18],
};
/** RF connectors: impedance, frequency to which it is rated (GHz, typical). */
const RF: Record<string, [number, number]> = { SMA: [50, 18], 'RP-SMA': [50, 18], BNC: [50, 4], N: [50, 11], F: [75, 1], 'U.FL': [50, 6], MCX: [50, 6] };

export const MORE: KindDef[] = [
  {
    id: 'taperbearing', name: 'tapered roller bearing', path: 'Mechanical/Bearings/Roller bearings', says: 'tapered rollers between cone and cup: it carries a heavy radial load and thrust one way, set in pairs', std: 'ISO 355, the 302 series',
    axes: [bare('number', 'bearing number', Object.keys(T302))],
    title: (p) => { const [d, D, T] = T302[s(p, 'number')]!; return `tapered roller bearing ${p.number} (${d} × ${D} × ${T})`; }, of: () => 'steel-chrome*2 steel-low grease', make: 'assemble', how: 'a cone carrying tapered rollers in a pressed cage, and its separate cup, case-hardened and ground',
    spec: (p) => { const [d, D, T] = T302[s(p, 'number')]!; return `${d} mm bore, ${D} mm cup, ${T} mm wide (ISO 355); takes thrust one way: mount two facing each other`; }, box: (p) => { const [, D, T] = T302[s(p, 'number')]!; return [D, D, T]; }, g: (p) => { const [d, D, T] = T302[s(p, 'number')]!; return gOf(ring(D, d, T) * 0.65, 7.83); },
  },
  {
    id: 'angularbearing', name: 'angular contact ball bearing', path: 'Mechanical/Bearings/Ball bearings', says: 'a ball bearing with its races offset so it carries thrust one way as well as load across it', std: 'ISO 15, the 72xx B series (40° contact)',
    axes: [bare('number', 'bearing number', Object.keys(SER2).map((k) => `72${k}`))],
    title: (p) => { const [d, D, B] = ser2(p); return `angular contact bearing ${p.number}B (${d} × ${D} × ${B})`; }, of: () => 'steel-chrome*2 bearing-cage grease', make: 'assemble', how: 'races ground with offset shoulders, a full ring of balls in a cage', spec: (p) => { const [d, D, B] = ser2(p); return `${d} × ${D} × ${B} mm (ISO 15); 40° contact: pairs back to back for thrust both ways`; },
    box: (p) => { const [, D, B] = ser2(p); return [D, D, B]; }, g: (p) => { const [d, D, B] = ser2(p); return gOf(ring(D, d, B) * 0.6, 7.83); },
  },
  {
    id: 'selfaligning', name: 'self-aligning ball bearing', path: 'Mechanical/Bearings/Ball bearings', says: 'two rows of balls in a spherical outer race: it takes a shaft that is not quite in line', std: 'ISO 15, the 12xx series',
    axes: [bare('number', 'bearing number', Object.keys(SER2).map((k) => `12${k}`))],
    title: (p) => { const [d, D, B] = ser2(p); return `self-aligning bearing ${p.number} (${d} × ${D} × ${B})`; }, of: () => 'steel-chrome*2 bearing-cage grease', make: 'assemble', how: 'two rows of balls in a cage between an inner ring with two grooves and an outer ring ground spherical', spec: (p) => { const [d, D, B] = ser2(p); return `${d} × ${D} × ${B} mm (ISO 15); takes about 2.5° misalignment (typical)`; },
    box: (p) => { const [, D, B] = ser2(p); return [D, D, B]; }, g: (p) => { const [d, D, B] = ser2(p); return gOf(ring(D, d, B) * 0.6, 7.83); },
  },
  {
    id: 'sphericalbearing', name: 'spherical roller bearing', path: 'Mechanical/Bearings/Roller bearings', says: 'two rows of barrel rollers in a spherical outer race: heavy loads and a shaft that bends', std: 'ISO 15, the 222 series',
    axes: [bare('number', 'bearing number', Object.keys(SPH))],
    title: (p) => { const [d, D, B] = SPH[s(p, 'number')]!; return `spherical roller bearing ${p.number} (${d} × ${D} × ${B})`; }, of: () => 'steel-chrome*2 brass grease', make: 'assemble', how: 'two rows of barrel rollers in a brass (or steel) cage, the outer race ground spherical', spec: (p) => { const [d, D, B] = SPH[s(p, 'number')]!; return `${d} × ${D} × ${B} mm (ISO 15); takes about 1.5–2.5° misalignment (typical)`; },
    box: (p) => { const [, D, B] = SPH[s(p, 'number')]!; return [D, D, B]; }, g: (p) => { const [d, D, B] = SPH[s(p, 'number')]!; return gOf(ring(D, d, B) * 0.68, 7.83); },
  },
  {
    id: 'acmotor', name: 'three-phase induction motor', path: 'Electrical/Motors and actuators/AC motors', says: 'a squirrel-cage motor that runs straight off the mains: the workhorse of machines, pumps and fans', std: 'IEC 60072 frames with the four-pole powers each is built for; two, four or six poles',
    axes: [bare('frame', 'frame', Object.keys(IEC)), unit('kW', 'power', 'kW', (p) => IEC[s(p, 'frame')]![0]), unit('poles', 'poles', 'P', [2, 4, 6]), bare('mount', 'mounting', ['B3', 'B5', 'B14'])],
    title: (p) => `${p.kW} kW ${p.poles}-pole induction motor, IEC ${p.frame} ${p.mount}`, of: () => 'lamination-stack winding*3 rotor-cage al-a380 steel-low {bearing 6205}*2 fan-blade', make: 'assemble', how: 'a laminated stator wound for three phases round an aluminium squirrel-cage rotor on two ball bearings, a fan on its back, in a ribbed die-cast frame',
    spec: (p) => { const sync = (120 * 50) / n(p, 'poles'), rpm = sync * (n(p, 'kW') < 1 ? 0.93 : 0.96), T = (n(p, 'kW') * 1000) / ((2 * Math.PI * rpm) / 60); return `${sync} rpm synchronous at 50 Hz (n = 120 f / p), about ${rpm.toFixed(0)} rpm loaded (slip typical); ${T.toFixed(1)} N·m at full power; shaft ${IEC[s(p, 'frame')]![1]} mm at ${parseInt(s(p, 'frame'), 10)} mm high (IEC 60072); ${p.mount === 'B3' ? 'foot' : p.mount === 'B5' ? 'large flange' : 'small face'} mounted`; },
    box: (p) => { const H = parseInt(s(p, 'frame'), 10); return [H * 2.3, H * 2.3, H * 3.6]; }, g: (p) => 2000 + n(p, 'kW') * 9000,
  },
  {
    id: 'mcb', name: 'miniature circuit breaker', path: 'Electrical/Circuit protection/Circuit breakers', says: 'a DIN-rail switch that trips on overload (a bimetal) and on a short circuit (a magnet)', std: 'IEC 60898-1 curves and rated currents, 6 kA',
    axes: [bare('curve', 'curve', ['B', 'C', 'D']), unit('A', 'rated current', 'A', [1, 2, 3, 4, 6, 10, 13, 16, 20, 25, 32, 40, 50, 63]), unit('poles', 'poles', 'P', [1, 2, 3, 4])],
    title: (p) => `${p.curve}${p.A} circuit breaker, ${p.poles}-pole`, of: (p) => `pbt bimetal-strip copper silver magnet-wire steel-low*${p.poles}`, make: 'assemble', how: 'in a moulded case: a bimetal for slow overloads, a coil and plunger for short circuits, contacts that open in an arc chute',
    spec: (p) => { const [lo, hi] = ({ B: [3, 5], C: [5, 10], D: [10, 20] } as Record<string, [number, number]>)[s(p, 'curve')]!; return `${p.A} A; trips at once between ${lo * n(p, 'A')} and ${hi * n(p, 'A')} A (curve ${p.curve}: ${lo}–${hi} × In, IEC 60898-1); 6 kA breaking`; },
    box: (p) => [17.5 * n(p, 'poles'), 85, 70], g: (p) => 110 * n(p, 'poles'),
  },
  {
    id: 'rcd', name: 'residual current device', path: 'Electrical/Circuit protection/RCDs', says: 'a DIN-rail switch that trips when current leaks to earth: it saves a life before a fuse would notice', std: 'IEC 61008-1 ratings',
    axes: [unit('A', 'rated current', 'A', [25, 40, 63]), unit('mA', 'trips at', 'mA', [30, 100, 300]), unit('poles', 'poles', 'P', [2, 4]), bare('type', 'type', ['AC', 'A'])],
    title: (p) => `${p.A} A ${p.mA} mA RCD, ${p.poles}-pole, type ${p.type}`, of: (p) => `pbt ferrite-soft magnet-wire copper silver steel-low*${p.poles}`, make: 'assemble', how: 'the live and neutral pass through a toroid: any difference between them (leakage) induces a current that releases the latch',
    spec: (p) => `trips by ${p.mA} mA of leakage, within 300 ms (IEC 61008-1)${n(p, 'mA') === 30 ? ': personal protection' : ': fire protection'}; type ${p.type === 'A' ? 'A also sees pulsing DC leakage' : 'AC sees AC leakage only'}`, box: (p) => [17.5 * n(p, 'poles'), 85, 70], g: (p) => 120 * n(p, 'poles'),
  },
  {
    id: 'contactor', name: 'contactor', path: 'Electrical/Switches/Contactors', says: 'a heavy relay that switches a motor or heater on its coil', std: 'IEC 60947-4-1 AC-3 ratings; the coils sold',
    axes: [unit('A', 'AC-3 rating', 'A', [9, 12, 18, 25, 32, 40, 50, 65]), bare('coil', 'coil', ['24VAC', '24VDC', '230VAC'])],
    title: (p) => `${p.A} A contactor, ${p.coil} coil`, of: () => 'pbt steel-electrical magnet-wire silver copper steel-spring', make: 'assemble', how: 'a coil pulls a laminated armature that closes three silver contacts against springs',
    spec: (p) => `${p.A} A switching a motor (AC-3), about ${(n(p, 'A') * 0.42).toFixed(1)} kW at 400 V (typical); coil ${p.coil}`, box: (p) => [45 + n(p, 'A') * 0.2, 80, 85], g: (p) => 320 + n(p, 'A') * 6,
  },
  {
    id: 'pushbutton22', name: '22 mm panel push button', path: 'Electrical/Switches/Push buttons', says: 'a panel button in a 22 mm hole: flush, mushroom, or the red emergency stop', std: 'IEC 60947-5-1 (22.5 mm cut-out); colours by IEC 60073',
    axes: [bare('form', 'form', ['flush', 'mushroom', 'estop']), bare('colour', 'colour', (p) => (p.form === 'estop' ? ['red'] : ['green', 'red', 'yellow', 'blue', 'white', 'black'])), bare('contact', 'contact', ['NO', 'NC', 'NO+NC'])],
    title: (p) => `22 mm ${p.form === 'estop' ? 'emergency stop' : `${p.form} push button`}, ${p.colour}, ${p.contact}`, of: () => 'nylon brass silver steel-spring', make: 'assemble', how: 'a moulded actuator in a ring nut, a contact block clipped behind', spec: (p) => `22.3 mm hole; ${p.colour} (IEC 60073: ${({ green: 'start', red: 'stop or emergency', yellow: 'abnormal', blue: 'must act', white: 'any', black: 'any' } as Record<string, string>)[s(p, 'colour')]}); 10 A contacts`,
    box: (p) => (p.form === 'flush' ? [30, 30, 45] : [40, 40, 55]), g: () => 45,
  },
  {
    id: 'conduit', name: 'electrical conduit', path: 'Electrical/Wire management/Conduit', says: 'a rigid or flexible tube that cable is drawn through', std: 'IEC 61386 outside diameters; cut to any length 10–3000 mm',
    axes: [bare('type', 'type', ['rigid', 'flexible']), ax('d', 'outside', 'mm', [16, 20, 25, 32, 40, 50]), unit('L', 'length', 'mm', [1000, 3000], [10, 3000, 1])],
    title: (p) => `${p.type} conduit ${p.d} mm, ${p.L} mm`, of: () => 'pvc', make: 'extrude', how: (p) => (p.type === 'rigid' ? 'PVC extruded straight' : 'PVC extruded corrugated so it bends'), spec: (p) => `${p.d} mm (IEC 61386); fill to about 40 % of its bore (typical)`,
    box: (p) => [n(p, 'd'), n(p, 'd'), n(p, 'L')], g: (p) => gOf(ring(n(p, 'd'), n(p, 'd') - 3, n(p, 'L')), 1.4) * (p.type === 'flexible' ? 0.6 : 1),
  },
  {
    id: 'polyvbelt', name: 'ribbed belt (poly-V)', path: 'Mechanical/Power transmission/V-belts', says: 'a flat belt with V ribs along it: thin, flexible, grips well on small pulleys', std: 'ISO 9982 sections; the rib counts and lengths sold',
    axes: [bare('section', 'section', Object.keys(PV)), ax('ribs', 'ribs', '', [3, 4, 5, 6, 8, 10, 12, 16]), unit('L', 'length', 'mm', [356, 432, 508, 610, 711, 813, 914, 1016, 1219, 1422, 1625, 2032])],
    title: (p) => `${p.ribs}${p.section} ${p.L} ribbed belt`, of: () => 'epdm pet', make: 'mould', how: 'polyester cords in EPDM, its ribs ground', spec: (p) => { const [pt, h] = PV[s(p, 'section')]!; return `${(n(p, 'ribs') * pt).toFixed(1)} mm wide (${p.ribs} ribs at ${pt} mm), ${h} mm thick (ISO 9982)`; },
    box: (p) => [n(p, 'L') / Math.PI, n(p, 'L') / Math.PI, n(p, 'ribs') * PV[s(p, 'section')]![0]], g: (p) => n(p, 'L') * n(p, 'ribs') * PV[s(p, 'section')]![0] * PV[s(p, 'section')]![1] * 0.0011,
  },
  {
    id: 'rfconn', name: 'RF coaxial connector', path: 'Electrical/Connectors/RF', says: 'a connector for coaxial cable that keeps its impedance through the joint', std: 'the types in use, with their impedance and the frequency each is good to (typical)',
    axes: [bare('type', 'type', Object.keys(RF)), bare('gender', 'gender', ['male', 'female']), bare('form', 'form', ['crimp', 'panel', 'pcb', 'rightangle'])],
    title: (p) => `${p.type} ${p.gender} connector, ${p.form === 'rightangle' ? 'right-angle' : p.form}`, of: () => 'brass gold ptfe nickel', make: 'machine', how: 'turned brass bodies, a gold-plated centre pin in a PTFE insulator', spec: (p) => { const [Z, f] = RF[s(p, 'type')]!; return `${Z} Ω, good to about ${f} GHz`; },
    box: (p) => (p.type === 'U.FL' ? [3, 3, 2.5] : p.type === 'N' ? [20, 20, 40] : [9, 9, 20]), g: (p) => (p.type === 'U.FL' ? 0.05 : p.type === 'N' ? 35 : 5),
  },
  {
    id: 'audiojack', name: 'audio jack', path: 'Electrical/Connectors/Audio', says: 'the round plug and socket of headphones and instruments', std: 'the 2.5, 3.5 and 6.35 mm sizes (IEC 60603-11 for 3.5 mm)',
    axes: [ax('d', 'size', 'mm', [2.5, 3.5, 6.35]), bare('poles', 'contacts', ['TS', 'TRS', 'TRRS']), bare('form', 'form', ['plug', 'panel', 'pcb'])],
    title: (p) => `${p.d} mm ${p.poles} ${p.form === 'plug' ? 'plug' : `${p.form} socket`}`, of: () => 'brass nickel gold pbt', make: 'assemble', how: 'turned brass rings and tip separated by insulating rings; a socket of springy contacts', spec: (p) => `${p.d} mm, ${p.poles === 'TS' ? 'mono' : p.poles === 'TRS' ? 'stereo, or balanced mono' : 'stereo and a microphone'}`,
    box: (p) => (p.form === 'plug' ? [n(p, 'd') * 2.5, n(p, 'd') * 2.5, n(p, 'd') * 9] : [n(p, 'd') * 3, n(p, 'd') * 3, n(p, 'd') * 4]), g: (p) => n(p, 'd') * (p.form === 'plug' ? 1.5 : 0.8),
  },
  {
    id: 'xlr', name: 'XLR connector', path: 'Electrical/Connectors/Audio', says: 'the locking round connector of microphones and stage audio', std: 'IEC 61076-2-103, 3, 4 and 5 pins',
    axes: [unit('pins', 'pins', 'P', [3, 4, 5]), bare('gender', 'gender', ['male', 'female']), bare('form', 'form', ['cable', 'panel'])],
    title: (p) => `XLR ${p.pins}-pin ${p.gender}, ${p.form}`, of: () => 'zamak brass silver nylon', make: 'assemble', how: 'a die-cast shell, silver-plated pins in a nylon insert, a latch', spec: (p) => `${p.pins} pins; balanced audio on pins 2 (hot) and 3 (cold), screen on 1 (AES14)`, box: (p) => (p.form === 'cable' ? [20, 20, 55] : [26, 31, 25]), g: () => 30,
  },
  {
    id: 'loudspeaker', name: 'loudspeaker driver', path: 'Electrical/Audio/Speakers', says: 'a voice coil in a magnet gap driving a cone that moves the air', std: 'the diameters, impedances and powers sold (typical)',
    axes: [unit('d', 'diameter', 'mm', [28, 40, 50, 66, 77, 100, 130, 165, 200, 250, 300]), unit('ohm', 'impedance', 'ohm', [4, 8]), unit('W', 'power', 'W', (p) => [0.5, 1, 2, 3, 5, 10, 20, 30, 50, 100, 200].filter((w) => w >= n(p, 'd') / 100 && w <= (n(p, 'd') / 40) ** 2 * 4))],
    title: (p) => `${p.d} mm speaker, ${p.ohm} Ω, ${p.W} W`, of: () => 'paper ferrite-hard magnet-wire steel-low rubber', make: 'assemble', how: 'a paper (or polypropylene) cone on a rubber surround and spider, a voice coil in the gap of a ferrite magnet',
    spec: (p) => `${p.ohm} Ω nominal; ${p.W} W; at that power ${Math.sqrt(n(p, 'W') * n(p, 'ohm')).toFixed(1)} V across it (V = √(P R))`, box: (p) => [n(p, 'd'), n(p, 'd'), n(p, 'd') * 0.45], g: (p) => n(p, 'd') ** 2 * 0.06,
  },
  {
    id: 'microphone', name: 'microphone capsule', path: 'Electrical/Audio/Microphones', says: 'an electret, MEMS or dynamic capsule that turns sound into a small voltage', std: 'the capsules sold (typical sensitivities)',
    axes: [bare('type', 'type', ['electret6', 'electret10', 'mems', 'dynamic'])],
    title: (p) => ({ electret6: '6 mm electret microphone capsule', electret10: '10 mm electret microphone capsule', mems: 'MEMS microphone', dynamic: 'dynamic microphone capsule' } as Record<string, string>)[s(p, 'type')]!, of: (p) => (p.type === 'dynamic' ? 'ndfeb magnet-wire pet steel-low' : p.type === 'mems' ? 'si-die ic-package' : 'pet steel-low si-die'), make: 'assemble', how: (p) => (p.type === 'dynamic' ? 'a light diaphragm with a coil in a magnet gap' : p.type === 'mems' ? 'a silicon membrane over a backplate, with its amplifier, in a tiny package' : 'a charged film over a backplate, with a FET inside the can'),
    spec: (p) => ({ electret6: 'about −44 dBV/Pa; 2–10 V bias through 2.2 kΩ', electret10: 'about −42 dBV/Pa', mems: 'about −38 dBFS/Pa, digital PDM or I²S', dynamic: 'about −54 dBV/Pa, no power needed' } as Record<string, string>)[s(p, 'type')]!,
    box: (p) => ({ electret6: [6, 6, 5], electret10: [9.7, 9.7, 6.7], mems: [3.5, 2.7, 1], dynamic: [35, 35, 20] } as Record<string, [number, number, number]>)[s(p, 'type')]!, g: (p) => (p.type === 'dynamic' ? 40 : 0.5),
  },
  {
    id: 'antenna', name: 'antenna', path: 'Electrical/RF/Antennas', says: 'a radiator cut to its band: a whip or dipole by its length, a patch by its size', std: 'the bands in use; lengths from the wavelength (λ = c / f)',
    axes: [bare('band', 'band', ['433MHz', '868MHz', '915MHz', '1575MHz', '2.4GHz', '5.8GHz']), bare('form', 'form', ['whip', 'dipole', 'pcb'])],
    title: (p) => `${p.band} ${p.form} antenna`, of: (p) => (p.form === 'pcb' ? 'fr4 copper' : 'brass pvc nickel'), make: 'assemble', how: (p) => (p.form === 'pcb' ? 'a copper trace on a small board, on a lead with a U.FL plug' : 'a brass radiator in a moulded sleeve on an SMA'),
    spec: (p) => { const f = Number(s(p, 'band').replace(/[MG]Hz/, '')) * (s(p, 'band').includes('GHz') ? 1e9 : 1e6), l = 2.998e8 / f; return `λ = ${(l * 1000).toFixed(0)} mm: a quarter-wave whip ${(l * 250).toFixed(1)} mm, a half-wave dipole ${(l * 500 * 0.95).toFixed(1)} mm end to end (×0.95 for its ends)`; },
    box: (p) => { const f = Number(s(p, 'band').replace(/[MG]Hz/, '')) * (s(p, 'band').includes('GHz') ? 1e9 : 1e6), l = (2.998e8 / f) * 1000; return p.form === 'pcb' ? [Math.min(l / 4, 80), 1, 20] : [10, 10, p.form === 'dipole' ? l / 2 : l / 4]; }, g: (p) => (p.form === 'pcb' ? 2 : 15),
  },
  {
    id: 'hydraulichose', name: 'hydraulic hose', path: 'Fluid/Tubing and hose/Hydraulic hose', says: 'rubber hose with two braids of steel wire, for oil at hundreds of bar', std: 'SAE J517 100R2AT, with its working pressures; any length cut to the centimetre',
    axes: [bare('dash', 'size', Object.keys(R2)), unit('L', 'length', 'm', [0.5, 1, 2, 5, 10], [0.05, 50, 0.01])],
    title: (p) => `100R2AT hose ${p.dash} (${R2[s(p, 'dash')]![0]} mm), ${p.L} m`, of: () => 'nbr steel-spring rubber', make: 'extrude', how: 'an oil-proof nitrile tube, two braids of high-tensile steel wire, a tough rubber cover', spec: (p) => { const [d, P] = R2[s(p, 'dash')]!; return `${d} mm bore; works at up to ${P} bar (SAE J517); bursts at four times that`; },
    box: (p) => { const d = R2[s(p, 'dash')]![0] + 10; return [d, d, Math.min(n(p, 'L') * 1000, 400)]; }, g: (p) => n(p, 'L') * (R2[s(p, 'dash')]![0] * 35 + 120),
  },
  {
    id: 'valve52', name: '5/2 pneumatic solenoid valve', path: 'Fluid/Pneumatics/Valves', says: 'the valve that drives a double-acting cylinder out and back: five ports, two positions', std: 'the port sizes and coils sold',
    axes: [bare('port', 'ports', ['G1/8', 'G1/4']), bare('coil', 'coil', ['24VDC', '230VAC']), bare('pilot', 'operated', ['single', 'double'])],
    title: (p) => `5/2 valve ${p.port}, ${p.coil}, ${p.pilot === 'single' ? 'spring return' : 'double solenoid'}`, of: (p) => `al-6061 stainless-304 nbr*6 magnet-wire bobbin${p.pilot === 'single' ? ' {spring d0.8 D8 L20 n6}' : ''}`, make: 'assemble', how: 'a spool sliding in a ported aluminium body, pushed by a solenoid pilot and back by a spring (or a second pilot)',
    spec: (p) => `${p.port} ports; 1.5–8 bar; ${p.pilot === 'single' ? 'returns when the coil is off' : 'stays where it was last put (a memory)'}`, box: () => [22, 60, 110], g: (p) => (p.pilot === 'single' ? 180 : 230),
  },
  {
    id: 'pexpipe', name: 'PEX pipe', path: 'Fluid/Tubing and hose/Plastic pipe', says: 'cross-linked polyethylene pipe for hot and cold water, flexible enough to bend round corners', std: 'EN ISO 15875 sizes; any length cut to the centimetre',
    axes: [bare('size', 'outside × wall', ['16x2', '20x2', '25x2.3', '32x2.9']), unit('L', 'length', 'm', [1, 5, 25, 50], [0.05, 200, 0.01])],
    title: (p) => `PEX pipe ${String(p.size).replace('x', ' × ')} mm, ${p.L} m`, of: () => 'pe', make: 'extrude', how: 'polyethylene extruded and cross-linked so it stands hot water', spec: (p) => `${p.size} mm; to 6 bar at 70 °C (class 2, EN ISO 15875, typical)`,
    box: (p) => { const d = Number(String(p.size).split('x')[0]); return [d, d, Math.min(n(p, 'L') * 1000, 400)]; }, g: (p) => { const [D, t] = String(p.size).split('x').map(Number) as [number, number]; return gOf(ring(D, D - 2 * t, n(p, 'L') * 1000), 0.94); },
  },
  {
    id: 'compressionfitting', name: 'compression fitting for copper', path: 'Fluid/Fittings/Compression fittings', says: 'a nut squeezing a brass ring onto copper tube to seal it, no solder', std: 'EN 1254-2, for 10–28 mm tube',
    axes: [bare('type', 'type', ['straight', 'elbow', 'tee', 'reducer', 'endcap']), ax('d', 'for tube', 'mm', [10, 12, 15, 22, 28])],
    title: (p) => `${p.d} mm compression ${p.type}`, of: (p) => `brass*${({ straight: 3, elbow: 3, tee: 4, reducer: 3, endcap: 2 } as Record<string, number>)[s(p, 'type')]}`, make: 'machine', alt: 'cast', how: 'a forged brass body, its nuts and its olives (soft brass rings)', spec: (p) => `for ${p.d} mm copper tube (EN 1254-2); the olive grips when its nut is turned`,
    box: (p) => { const k = n(p, 'd') * 1.8; return p.type === 'tee' ? [k * 2.2, k * 1.6, k] : p.type === 'elbow' ? [k * 1.5, k * 1.5, k] : [k, k, k * 2.2]; }, g: (p) => n(p, 'd') ** 2 * 0.25,
  },
  {
    id: 'drywallscrew', name: 'drywall and wood screw', path: 'Hardware/Fasteners/Wood screws', says: 'a bugle-head screw with a sharp point and a coarse thread, for board on studs and for wood', std: 'the sizes sold (typical)',
    axes: [bare('size', 'diameter × length', ['3.5x25', '3.5x35', '3.5x45', '3.9x45', '3.9x55', '4.2x65', '4.8x75']), bare('thread', 'thread', ['coarse', 'fine']), bare('finish', 'finish', ['black', 'zinc'])],
    title: (p) => `drywall screw ${String(p.size).replace('x', ' × ')}, ${p.thread}, ${p.finish}`, of: () => 'steel-low zinc', make: 'roll-thread', how: 'cold-headed with its bugle head and a Phillips 2 recess, thread-rolled, case-hardened, phosphated (or zinc-plated)', spec: (p) => `${p.size} mm; ${p.thread === 'coarse' ? 'for timber studs' : 'for metal studs'}`,
    box: (p) => { const [d, L] = String(p.size).split('x').map(Number) as [number, number]; return [d * 2.2, d * 2.2, L]; }, g: (p) => { const [d, L] = String(p.size).split('x').map(Number) as [number, number]; return gOf(cyl(d * 0.85, L), 7.85); },
  },
  {
    id: 'chipboardscrew', name: 'chipboard (wood) screw', path: 'Hardware/Fasteners/Wood screws', says: 'a countersunk wood screw with a sharp point, Pozidriv, threaded most of its length', std: 'diameters 3–6 mm in the lengths makers sell (typical)',
    axes: [ax('d', 'diameter', 'mm', [3, 3.5, 4, 4.5, 5, 6]), ax('L', 'length', 'mm', (p) => [12, 16, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 100, 120].filter((L) => L >= 4 * n(p, 'd') && L <= 25 * n(p, 'd'))), bare('finish', 'finish', ['zinc', 'yellow', 'A2'])],
    title: (p) => `wood screw ${p.d} × ${p.L}, ${p.finish === 'A2' ? 'stainless' : `${p.finish} zinc`}`, of: (p) => (p.finish === 'A2' ? 'stainless-304' : 'steel-low zinc'), make: 'roll-thread', how: 'cold-headed with its countersunk head and Pozidriv recess, its thread and point rolled, hardened', spec: (p) => `${p.d} × ${p.L} mm; pilot hole about ${(n(p, 'd') * 0.6).toFixed(1)} mm in hardwood (typical)`,
    box: (p) => [n(p, 'd') * 2, n(p, 'd') * 2, n(p, 'L')], g: (p) => gOf(cyl(n(p, 'd') * 0.85, n(p, 'L')), 7.85),
  },
  {
    id: 'biketyre', name: 'bicycle tyre', path: 'Mechanical/Vehicle parts/Wheels', says: 'a clincher tyre by its ETRTO size: width and bead seat', std: 'ETRTO (ISO 5775) widths and bead seats',
    axes: [ax('w', 'width', 'mm', [23, 25, 28, 32, 35, 38, 40, 42, 47, 50, 54, 57, 60]), unit('bead', 'bead seat', 'mm', [559, 584, 622]), bare('bead2', 'bead', ['wire', 'folding'])],
    title: (p) => `bicycle tyre ${p.w}-${p.bead} (${BEAD[n(p, 'bead')]}), ${p.bead2}`, of: (p) => `rubber nylon ${p.bead2 === 'wire' ? 'steel-spring' : 'pet'}`, make: 'mould', how: 'rubber vulcanised over a nylon casing, beads of steel wire (or of aramid, to fold)', spec: (p) => `ETRTO ${p.w}-${p.bead}: ${BEAD[n(p, 'bead')]}, ${p.w} mm wide; about ${(n(p, 'bead') + 2 * n(p, 'w')).toFixed(0)} mm across inflated`,
    box: (p) => [n(p, 'bead') + 2 * n(p, 'w'), n(p, 'bead') + 2 * n(p, 'w'), n(p, 'w')], g: (p) => n(p, 'w') * 9 + (p.bead2 === 'wire' ? 80 : 0),
  },
  {
    id: 'memorycard', name: 'memory card', path: 'Electrical/Computer parts/Storage', says: 'flash memory on a card', std: 'SD and microSD sizes (SD Association), the capacities sold',
    axes: [bare('form', 'form', ['microSD', 'SD']), unit('GB', 'capacity', 'GB', [4, 8, 16, 32, 64, 128, 256, 512, 1024]), bare('speed', 'class', ['U1', 'U3', 'V30', 'A2'])],
    title: (p) => `${p.form} card ${n(p, 'GB') >= 1024 ? '1 TB' : `${p.GB} GB`}, ${p.speed}`, of: () => 'si-die*2 pcb-bare pc', make: 'assemble', how: 'NAND flash and a controller die on a tiny board, moulded into its card', spec: (p) => `${p.form === 'SD' ? '32 × 24 × 2.1 mm' : '15 × 11 × 1 mm'}; ${p.speed === 'U1' ? 'writes at least 10 MB/s' : p.speed === 'U3' ? 'at least 30 MB/s' : p.speed === 'V30' ? 'at least 30 MB/s, for video' : 'fast at small random reads (apps)'}; ${n(p, 'GB') <= 32 ? 'SDHC, FAT32' : 'SDXC, exFAT'}`,
    box: (p) => (p.form === 'SD' ? [24, 32, 2.1] : [11, 15, 1]), g: (p) => (p.form === 'SD' ? 2 : 0.4),
  },
  {
    id: 'sensormodule', name: 'sensor module', path: 'Electrical/Sensors/Modules', says: 'a sensor on its breakout board, ready to wire to a microcontroller', std: 'the common modules by name, with their datasheet ranges',
    axes: [bare('part', 'module', Object.keys(MODULES))],
    title: (p) => `${p.part} ${MODULES[s(p, 'part')]![0]} module`, of: () => 'pcb-bare ic-package pin-header smd-passives', make: 'solder', how: 'its sensor and the parts it needs soldered to a small board with a pin header', spec: (p) => `${MODULES[s(p, 'part')]![0]}: ${MODULES[s(p, 'part')]![1]}`,
    box: (p) => [MODULES[s(p, 'part')]![2], 5, MODULES[s(p, 'part')]![3]], g: (p) => MODULES[s(p, 'part')]![2] * MODULES[s(p, 'part')]![3] * 0.006,
  },
];
