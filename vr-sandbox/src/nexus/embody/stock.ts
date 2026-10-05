// What can be had: standard components as their standards and makers define them. A part embodiment chooses must be
// one that exists (a 4.3 mm screw does not), with the dimensions its standard fixes. Every table names its standard or
// its source and how sure it is: 'standard' (fixed by the standard itself), 'maker' (a maker's published rating), or
// 'estimate' (an order of magnitude with its grounds). Lengths in metres, currents in amperes, temperatures in °C.

const mm = 1e-3;

export type Confidence = 'standard' | 'maker' | 'estimate';
export interface Sourced { source: string; confidence: Confidence }

// ---- fasteners ---------------------------------------------------------------------------------------------------------

/** ISO 4762 socket head cap screws: head diameter dk, head height k, hex key s. */
export const SOCKET_HEAD: Record<string, { d: number; dk: number; k: number; s: number }> & { src?: Sourced } = {
  M2: { d: 2 * mm, dk: 3.8 * mm, k: 2 * mm, s: 1.5 * mm },
  M2_5: { d: 2.5 * mm, dk: 4.5 * mm, k: 2.5 * mm, s: 2 * mm },
  M3: { d: 3 * mm, dk: 5.5 * mm, k: 3 * mm, s: 2.5 * mm },
  M4: { d: 4 * mm, dk: 7 * mm, k: 4 * mm, s: 3 * mm },
  M5: { d: 5 * mm, dk: 8.5 * mm, k: 5 * mm, s: 4 * mm },
  M6: { d: 6 * mm, dk: 10 * mm, k: 6 * mm, s: 5 * mm },
  M8: { d: 8 * mm, dk: 13 * mm, k: 8 * mm, s: 6 * mm },
};
export const SOCKET_HEAD_SRC: Sourced = { source: 'ISO 4762 (maximum head dimensions)', confidence: 'standard' };
/** ISO preferred lengths for socket head cap screws, as stocked. */
export const SCREW_LENGTHS = [4, 5, 6, 8, 10, 12, 16, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 80].map((x) => x * mm);
/** ISO 4032 hex nuts: height m, across flats s. ISO 7089 plain washers: inner, outer, thickness. */
export const NUT: Record<string, { m: number; s: number }> = { M2: { m: 1.6 * mm, s: 4 * mm }, M2_5: { m: 2 * mm, s: 5 * mm }, M3: { m: 2.4 * mm, s: 5.5 * mm }, M4: { m: 3.2 * mm, s: 7 * mm }, M5: { m: 4.7 * mm, s: 8 * mm }, M6: { m: 5.2 * mm, s: 10 * mm }, M8: { m: 6.8 * mm, s: 13 * mm } };
export const WASHER: Record<string, { di: number; dout: number; h: number }> = { M3: { di: 3.2 * mm, dout: 7 * mm, h: 0.5 * mm }, M4: { di: 4.3 * mm, dout: 9 * mm, h: 0.8 * mm }, M5: { di: 5.3 * mm, dout: 10 * mm, h: 1 * mm }, M6: { di: 6.4 * mm, dout: 12 * mm, h: 1.6 * mm }, M8: { di: 8.4 * mm, dout: 16 * mm, h: 1.6 * mm } };
export const NUT_SRC: Sourced = { source: 'ISO 4032 hex nuts; ISO 7089 washers', confidence: 'standard' };
/** The shortest stocked screw at least `L` long. */
export const stockScrew = (L: number) => SCREW_LENGTHS.find((x) => x >= L - 1e-9) ?? null;

// ---- bearings and guides -------------------------------------------------------------------------------------------

/** Deep groove ball bearings, ISO 15 dimension series: bore d, outer D, width B. */
export const BALL_BEARINGS: { id: string; d: number; D: number; B: number }[] = [
  { id: '623', d: 3 * mm, D: 10 * mm, B: 4 * mm }, { id: '624', d: 4 * mm, D: 13 * mm, B: 5 * mm }, { id: '625', d: 5 * mm, D: 16 * mm, B: 5 * mm },
  { id: '626', d: 6 * mm, D: 19 * mm, B: 6 * mm }, { id: '608', d: 8 * mm, D: 22 * mm, B: 7 * mm }, { id: '6000', d: 10 * mm, D: 26 * mm, B: 8 * mm },
  { id: '6001', d: 12 * mm, D: 28 * mm, B: 8 * mm }, { id: '6002', d: 15 * mm, D: 32 * mm, B: 9 * mm }, { id: '6003', d: 17 * mm, D: 35 * mm, B: 10 * mm },
];
export const BALL_BEARINGS_SRC: Sourced = { source: 'ISO 15 boundary dimensions (6xx and 60xx series)', confidence: 'standard' };
/** Linear ball bushings for round shafts (LMxxUU): shaft d, outer D, length L. */
export const LINEAR_BUSHINGS: { id: string; d: number; D: number; L: number }[] = [
  { id: 'LM6UU', d: 6 * mm, D: 12 * mm, L: 19 * mm }, { id: 'LM8UU', d: 8 * mm, D: 15 * mm, L: 24 * mm }, { id: 'LM10UU', d: 10 * mm, D: 19 * mm, L: 29 * mm },
  { id: 'LM12UU', d: 12 * mm, D: 21 * mm, L: 30 * mm }, { id: 'LM16UU', d: 16 * mm, D: 28 * mm, L: 37 * mm }, { id: 'LM20UU', d: 20 * mm, D: 32 * mm, L: 42 * mm },
];
export const LINEAR_BUSHINGS_SRC: Sourced = { source: 'LM..UU linear bushing series (THK/Misumi catalogues, JIS-derived)', confidence: 'maker' };
/** Rolling friction of a ball bushing on a hardened shaft. */
export const BUSHING_FRICTION = { mu: 0.003, source: 'ball bushings: 0.002 to 0.003 (THK linear bushing catalogue)', confidence: 'maker' as Confidence };

// ---- transmissions ---------------------------------------------------------------------------------------------------

/** GT2 timing belts and pulleys: a 2 mm pitch; the pitch diameter of a z-tooth pulley is z × pitch / π. */
export const GT2 = { pitch: 2 * mm, widths: [6 * mm, 9 * mm, 10 * mm], teeth: [16, 20, 30, 36, 40, 60], bores: [5 * mm, 8 * mm], source: 'Gates PowerGrip GT2 2 mm pitch', confidence: 'maker' as Confidence };
/** A GT2 belt's axial stiffness per metre of span, EA: glass-fibre cords of about 70 GPa over about 0.8 mm² in a 6 mm belt. */
export const GT2_EA_PER_WIDTH = { value: (72e9 * 0.8e-6) / (6 * mm), source: 'estimated from its cords: E-glass about 72 GPa, about 0.8 mm² of cord in a 6 mm belt', confidence: 'estimate' as Confidence };
/** Trapezoidal lead screws, ISO 2904 Tr: nominal d, pitch P, starts. Lead = P × starts. */
export const TR_SCREWS: { id: string; d: number; P: number; starts: number }[] = [
  { id: 'Tr8x2', d: 8 * mm, P: 2 * mm, starts: 1 }, { id: 'Tr8x8 (P2)', d: 8 * mm, P: 2 * mm, starts: 4 }, { id: 'Tr10x2', d: 10 * mm, P: 2 * mm, starts: 1 },
  { id: 'Tr12x3', d: 12 * mm, P: 3 * mm, starts: 1 }, { id: 'Tr16x4', d: 16 * mm, P: 4 * mm, starts: 1 },
];
export const TR_SRC: Sourced = { source: 'ISO 2904 trapezoidal threads (30° flank angle)', confidence: 'standard' };
/** Friction of a bronze or brass nut on a steel screw, lubricated; the low end decides whether it holds itself. */
export const SCREW_FRICTION = { lo: 0.1, mid: 0.15, source: 'steel on bronze, lubricated: about 0.1 to 0.15 (Machinery\'s Handbook; Shigley table 8-5)', confidence: 'maker' as Confidence };

// ---- conductors and their insulation --------------------------------------------------------------------------------

/** An American Wire Gauge size's diameter, by its definition: d = 0.127 mm × 92^((36 − n)/39) (ASTM B258). */
export const awgDiameter = (n: number) => 0.127 * mm * 92 ** ((36 - n) / 39);
export const AWG_SIZES = [30, 28, 26, 24, 22, 20, 18, 16, 14, 12, 10];
/** Resistivity of annealed copper at 20 °C (IACS) and its temperature coefficient. */
export const COPPER = { rho: 1.7241e-8, alpha: 0.00393, density: 8960, source: 'IEC 60028: 1/58 Ω mm²/m at 20 °C; α = 0.00393 /K', confidence: 'standard' as Confidence };
/** Insulations: the hottest the conductor may run, the wall for a hook-up wire of that kind, the voltage it is rated for. */
export const INSULATIONS: { id: string; name: string; maxC: number; wall: number; volts: number; flexible: boolean; source: string }[] = [
  { id: 'PVC-80', name: 'PVC (UL 1007)', maxC: 80, wall: 0.38 * mm, volts: 300, flexible: false, source: 'UL 1007: 80 °C, 300 V, 0.38 mm PVC' },
  { id: 'PVC-105', name: 'PVC (UL 1015)', maxC: 105, wall: 0.8 * mm, volts: 600, flexible: false, source: 'UL 1015: 105 °C, 600 V, 0.8 mm PVC' },
  { id: 'SIL-200', name: 'silicone rubber (UL 3135)', maxC: 200, wall: 0.8 * mm, volts: 600, flexible: true, source: 'UL 3135: 200 °C, 600 V silicone' },
  { id: 'PTFE-200', name: 'PTFE (UL 1213)', maxC: 200, wall: 0.25 * mm, volts: 600, flexible: false, source: 'UL 1213 / MIL-W-16878 type E: 200 °C PTFE' },
  { id: 'XLPE-90', name: 'XLPE (IEC 60502-1, 1.8/3 kV)', maxC: 90, wall: 2.0 * mm, volts: 3000, flexible: false, source: 'IEC 60502-1: XLPE-insulated power cable, 90 °C, 1.8/3 kV, about 2.0 mm of insulation' },
];
/** Natural convection and radiation from a thin cable in still air, the heat a conductor sheds per area per kelvin. */
export const CABLE_H = { value: 12, source: 'natural convection from a horizontal cylinder of a few mm in air (Churchill–Chu), about 8 to 10, plus radiation from insulation of emissivity about 0.9 at moderate rise, about 5: an estimate', confidence: 'estimate' as Confidence };

/** Colour by function, by the standard that says so. */
export const COLOURS: Record<string, { colour: string; hex: number; standard: string }> = {
  'mains line': { colour: 'brown', hex: 0x8b5a2b, standard: 'IEC 60445: line conductor brown' },
  'mains neutral': { colour: 'blue', hex: 0x1e64d2, standard: 'IEC 60445: neutral conductor blue' },
  'protective earth': { colour: 'green-and-yellow', hex: 0x9ccc32, standard: 'IEC 60445: protective conductor green-and-yellow, and never any other conductor' },
  'dc positive': { colour: 'red', hex: 0xd32f2f, standard: 'IEC 60445 (DC): positive red, by common practice' },
  'dc negative': { colour: 'black', hex: 0x212121, standard: 'IEC 60445 (DC): negative black or blue, by common practice' },
  signal: { colour: 'yellow', hex: 0xfbc02d, standard: 'by function: a signal conductor distinct from supply colours' },
  'phase 1': { colour: 'black', hex: 0x212121, standard: 'numbered by IEC 60062 order (0 black … 9 white)' },
  'phase 2': { colour: 'brown', hex: 0x795548, standard: 'numbered by IEC 60062 order' },
  'phase 3': { colour: 'red', hex: 0xe53935, standard: 'numbered by IEC 60062 order' },
  'sensor supply': { colour: 'orange', hex: 0xfb8c00, standard: 'numbered by IEC 60062 order (3 orange)' },
  'sensor return': { colour: 'white', hex: 0xeeeeee, standard: 'numbered by IEC 60062 order (9 white)' },
};

/** The numbered colours in IEC 60062 order (0 black … 9 white), what a conductor takes when its function's colour is already used in its cable. */
export const IEC_60062: { colour: string; hex: number }[] = [
  { colour: 'black', hex: 0x212121 }, { colour: 'brown', hex: 0x795548 }, { colour: 'red', hex: 0xe53935 }, { colour: 'orange', hex: 0xfb8c00 }, { colour: 'yellow', hex: 0xfbc02d },
  { colour: 'green', hex: 0x43a047 }, { colour: 'blue', hex: 0x1e88e5 }, { colour: 'violet', hex: 0x8e24aa }, { colour: 'grey', hex: 0x9e9e9e }, { colour: 'white', hex: 0xeeeeee },
];

/** Connectors as rated by their makers: pitch, current per contact, voltage. */
export const CONNECTORS: { id: string; pitch: number; amps: number; volts: number; source: string }[] = [
  { id: 'JST PH', pitch: 2.0 * mm, amps: 2, volts: 100, source: 'JST PH series: 2.0 mm, 2 A, 100 V' },
  { id: 'JST XH', pitch: 2.5 * mm, amps: 3, volts: 250, source: 'JST XH series: 2.5 mm, 3 A, 250 V' },
  { id: 'Molex Micro-Fit 3.0', pitch: 3.0 * mm, amps: 5, volts: 600, source: 'Molex Micro-Fit 3.0: 3.0 mm, 5 A per contact, 600 V' },
  { id: 'screw terminal 5.08', pitch: 5.08 * mm, amps: 10, volts: 300, source: 'pluggable terminal blocks 5.08 mm: about 10 A (Phoenix Contact MSTB class)' },
  { id: 'XT60', pitch: 7.2 * mm, amps: 30, volts: 500, source: 'AMASS XT60: 30 A continuous' },
  { id: 'IEC 60320 C14 inlet', pitch: 0, amps: 10, volts: 250, source: 'IEC 60320 C13/C14: 10 A, 250 V' },
];
/** IEC 60127 miniature fuse ratings, A. */
export const FUSE_RATINGS = [0.5, 0.8, 1, 1.25, 1.6, 2, 2.5, 3.15, 4, 5, 6.3, 8, 10];
/** Power supplies of one common family: rated power at 24 V, W (Mean Well LRS series). */
export const PSU_24V = [{ id: 'LRS-150-24', W: 150 }, { id: 'LRS-200-24', W: 200 }, { id: 'LRS-350-24', W: 350 }, { id: 'LRS-600-24', W: 600 }];
/** Cable carriers (drag chains): inner height × width and the bend radii offered, as one maker's series. */
export const CABLE_CARRIERS: { id: string; h: number; w: number; radii: number[] }[] = [
  { id: 'E2 micro 7×7', h: 7 * mm, w: 7 * mm, radii: [15 * mm, 18 * mm] }, { id: 'E2 micro 10×15', h: 10 * mm, w: 15 * mm, radii: [18 * mm, 28 * mm, 38 * mm] },
  { id: 'E2 micro 10×20', h: 10 * mm, w: 20 * mm, radii: [18 * mm, 28 * mm, 38 * mm, 48 * mm] }, { id: 'E2 micro 15×30', h: 15 * mm, w: 30 * mm, radii: [28 * mm, 38 * mm, 48 * mm] },
];
export const CARRIER_SRC: Sourced = { source: 'igus E2 micro series (inner dimensions and radii, about)', confidence: 'maker' };
/** A solderless breadboard of 830 points: 63 rows of two five-hole strips, four rails, 2.54 mm pitch, about 165 × 55 mm. */
export const BREADBOARD = { pitch: 2.54 * mm, rows: 63, rails: 4, width: 55 * mm, length: 165 * mm, contactA: 1, source: 'the common 830-point solderless breadboard: half-rows of five joined clips either side of a 7.62 mm channel, four rails along it; its clips are rated about 1 A (makers give 1 to 5 A; the lowest is kept)', confidence: 'maker' as Confidence };

// ---- motor and heater matter ---------------------------------------------------------------------------------------

/** Non-oriented electrical steel (M19 class, 0.35 mm): the flux density it is designed to, its density, its loss. */
export const ELECTRICAL_STEEL = { Bdesign: 1.5, Bsat: 1.8, density: 7650, lamination: 0.35 * mm, lossWkgAt1T5_50Hz: 2.5, source: 'M19 / M270-35A non-oriented steel: saturates near 1.8 T; about 2.5 W/kg at 1.5 T, 50 Hz (EN 10106)', confidence: 'maker' as Confidence };
/** Sintered NdFeB N42: remanence, recoil permeability, the hottest it holds its strength at. */
export const NDFEB_N42 = { Br: 1.3, muR: 1.05, maxC: 80, density: 7500, source: 'grade N42: Br 1.28 to 1.32 T, Hcj ≥ 955 kA/m, 80 °C maximum working temperature (IEC 60404-8-1 class)', confidence: 'maker' as Confidence };
/** NdFeB grades by the heat they hold their strength at: the same remanence class, a coercivity raised with dysprosium. */
export const NDFEB_GRADES = [
  { id: 'N42', Br: 1.3, maxC: 80 }, { id: 'N42SH', Br: 1.29, maxC: 150 }, { id: 'N42UH', Br: 1.28, maxC: 180 },
];
export const NDFEB_GRADES_SRC = { source: 'sintered NdFeB grade suffixes: none 80 °C, SH 150 °C, UH 180 °C maximum working temperature (makers\' grade tables)', confidence: 'maker' as Confidence };
/** A slot no deeper than about five of its own widths: deeper, its leakage inductance and its tooth's flexing grow. */
export const SLOT_ASPECT = { value: 5, source: 'slot depth to width about 2 to 5 in practice (Hendershot and Miller)', confidence: 'estimate' as Confidence };
/** Magnet wire insulation classes: the hottest a winding may run. */
export const WINDING_CLASS = { id: 'class F (155 °C)', maxC: 155, source: 'IEC 60085 thermal class F: 155 °C', confidence: 'standard' as Confidence };
/** Nichrome 80/20 heating wire. */
export const NICHROME = { rho: 1.09e-6, maxC: 1150, source: 'NiCr 80/20: 1.09 µΩ m, to about 1150 °C (resistance wire makers\' data)', confidence: 'maker' as Confidence };
/** Cartridge heaters in a metal block: the most power per sheath area before the sheath runs too hot. */
export const CARTRIDGE_WATT_DENSITY = { value: 30e4, source: 'about 30 W/cm² for a tight fit in aluminium (cartridge heater makers\' guidance, e.g. Watlow FIREROD)', confidence: 'maker' as Confidence };
/** The shear a small enclosed permanent-magnet motor's air gap carries continuously, cooled by still air. */
export const GAP_SHEAR = { value: 4e3, source: 'tangential stress about 1 to 8 kPa for small totally enclosed PM machines (Pyrhönen, Design of Rotating Electrical Machines, table 6.3): a mid value', confidence: 'estimate' as Confidence };
/** A 12-slot, 10-pole concentrated winding's fundamental winding factor. */
export const WINDING_FACTOR_12S10P = { value: 0.933, source: 'q = 2/5 concentrated winding: k_w1 = 0.933 (Meier, Theoretical design of surface-mounted PM machines)', confidence: 'standard' as Confidence };
/** The current a winding carries per area, cooled by still air. */
export const CURRENT_DENSITY = { value: 5e6, source: 'about 4 to 6 A/mm² for totally enclosed small machines (Hendershot and Miller)', confidence: 'estimate' as Confidence };
/** The share of a slot copper fills, round wire wound by machine. */
export const SLOT_FILL = { value: 0.4, source: 'about 0.35 to 0.45 for machine-wound round wire', confidence: 'estimate' as Confidence };
/** The narrowest air gap a small motor's bearings and machining hold. */
export const AIR_GAP = { value: 0.4 * mm, source: 'about 0.3 to 0.5 mm in small machines, set by runout and tolerance', confidence: 'estimate' as Confidence };

// ---- frame ------------------------------------------------------------------------------------------------------------

/** 20 × 20 mm aluminium profile, slot 6: second moment of area, area, mass per metre. */
export const PROFILE_2020 = { side: 20 * mm, I: 0.69e-8, A: 1.6e-4, massPerM: 0.48, slot: 6 * mm, source: 'Misumi HFS5-2020: I about 0.69 cm⁴, about 0.48 kg/m', confidence: 'maker' as Confidence };

// ---- for anything that moves, flies, holds heat or carries water (src/nexus/embody/any.ts) ------------------------
/** The tangential stress a machine's air gap carries, by how it is cooled: what sizes a motor's rotor for its torque. */
export const GAP_SHEAR_BY_COOLING = [
  { cooling: 'still air', value: 4e3, h: 15, overhead: 0 }, { cooling: 'a fan', value: 12e3, h: 45, overhead: 0.08 }, { cooling: 'liquid', value: 35e3, h: 300, overhead: 0.35 },
] as const;
export const GAP_SHEAR_BY_COOLING_SRC = { source: 'torque per rotor volume about 7 to 14 kN m/m³ for small totally enclosed machines, 14 to 42 integral-horsepower industrial, near 100 for liquid-cooled traction motors (Hendershot and Miller); σ is half of it. h is what the housing gives off per kelvin and square metre: about 10 to 20 W/m²K to still air, 30 to 60 with a fan over fins, a few hundred referred to the housing for a water jacket (estimate). overhead: what the cooling weighs over the motor, a fan and its shroud about 8 %, a jacket, pump and radiator about a third (estimate)', confidence: 'estimate' as const };
/** A Li-ion cell as its maker rates it. */
export const LI_ION_21700 = { id: 'INR21700-50E', V: 3.6, Vmax: 4.2, Vmin: 2.5, Ah: 4.9, Imax: 9.8, mass: 0.0685, d: 21.25 * mm, l: 70.8 * mm, source: 'Samsung SDI INR21700-50E datasheet: 3.6 V nominal, 4.9 Ah, 9.8 A continuous, 68.5 g, Ø21.25 × 70.8 mm', confidence: 'datasheet' as const };
/** What a pack adds to its cells: holders, busbars, the management board, the case. */
export const PACK_OVERHEAD = { value: 1.35, source: 'pack mass about 1.25 to 1.5 times its cells for small packs (estimate)', confidence: 'estimate' as const };
/** Wheels as stocked: radius, width, the most load each carries. */
export const TYRES = [
  { id: 'castor 100 mm', r: 0.05, w: 0.03, load: 400 }, { id: 'cart wheel 200 mm', r: 0.1, w: 0.05, load: 1200 },
  { id: 'scooter 10 inch', r: 0.127, w: 0.065, load: 1500 }, { id: '155/80 R13', r: 0.28, w: 0.155, load: 4600 },
  { id: '205/55 R16', r: 0.316, w: 0.205, load: 6000 }, { id: '235/45 R18', r: 0.34, w: 0.235, load: 7000 },
];
export const TYRES_SRC = { source: 'ETRTO load indices (205/55 R16 91: 615 kg) and wheel makers\' ratings for castors and cart wheels; widths nominal', confidence: 'estimate' as const };
export const ROLLING_RESISTANCE = { value: 0.01, source: 'about 0.007 to 0.015 for pneumatic tyres on asphalt (estimate)', confidence: 'estimate' as const };
export const DRAG_COEFFICIENT = { value: 0.32, source: 'about 0.25 to 0.35 for a closed road body (estimate)', confidence: 'estimate' as const };
/** Rectangular hollow sections, cold-formed: outside sizes and wall. */
export const RECT_TUBES = [[30, 20, 2], [40, 20, 2], [50, 30, 3], [60, 40, 3], [80, 40, 4], [100, 50, 4], [120, 60, 5], [150, 100, 6]].map(([b, h, t]) => ({ id: `RHS ${b}×${h}×${t}`, b: b! * mm, h: h! * mm, t: t! * mm }));
export const RECT_TUBES_SRC = { source: 'EN 10219 cold-formed rectangular hollow sections (a selection)', confidence: 'standard' as const };
/** Copper tube for water, outside diameter and wall. */
export const COPPER_PIPES = [[10, 0.7], [15, 0.7], [22, 0.9], [28, 0.9], [35, 1.2], [42, 1.2]].map(([d, t]) => ({ id: `Cu ${d} × ${t}`, d: d! * mm, t: t! * mm }));
export const COPPER_PIPES_SRC = { source: 'EN 1057 copper tube, half-hard (a selection)', confidence: 'standard' as const };
export const PIPE_VELOCITY = { value: 1.5, source: 'water in domestic pipes kept below about 1.5 to 2 m/s against noise and erosion (estimate)', confidence: 'estimate' as const };
/** Axial and inline duct fans by diameter: the flow each moves against a small duct. */
export const FANS = [[0.1, 0.025], [0.125, 0.045], [0.15, 0.075], [0.2, 0.15], [0.25, 0.25], [0.315, 0.4]].map(([d, q]) => ({ id: `${Math.round(d! * 1e3)} mm inline fan`, d: d!, q: q!, W: Math.round(q! * 300) }));
export const FANS_SRC = { source: 'inline duct fans: about 90 m³/h at 100 mm to 1400 m³/h at 315 mm, about 300 W per m³/s at low pressure (makers\' ranges, estimate)', confidence: 'estimate' as const };
export const MINERAL_WOOL = { k: 0.035, density: 30, source: 'glass and stone wool batts: λ about 0.032 to 0.040 W/m K (EN 13162 declared values)', confidence: 'estimate' as const };
/** What an envelope's walls, roof and floor let through per area per kelvin, where the person asks for an efficient one. */
export const ENVELOPE_U = { wall: 0.18, roof: 0.13, floor: 0.15, source: 'about the Passive House component guidance (0.1 to 0.15 W/m²K) and good new-build practice (0.18 to 0.25)', confidence: 'estimate' as const };
/** Aluminium honeycomb as a crush element: the stress it crushes at, nearly flat over its stroke. */
export const HONEYCOMB = { sigma: 1.7e6, density: 50, source: 'aluminium 5052 honeycomb, 3/16 in cell, 3.1 pcf: crush strength about 1.6 to 1.9 MPa (makers\' data, estimate)', confidence: 'estimate' as const };
/** Rotors for lift: the disc loading small multirotors run at, and how much of the ideal power a rotor reaches. */
export const ROTOR = { discLoading: 250, figureOfMerit: 0.65, tipSpeed: 150, source: 'small multirotors: disc loading about 100 to 400 N/m², figure of merit about 0.6 to 0.7, tip speeds about 100 to 200 m/s (estimate)', confidence: 'estimate' as const };
/** How far past its continuous torque a traction motor is driven for a short while. */
export const PEAK_OVER_CONTINUOUS = { value: 2.5, source: 'traction motor datasheets rate peak torque about 2 to 3 times continuous for 30 to 60 s (IEC 60034-1 S2 short-time duty); estimate', confidence: 'estimate' as const };
/** A heat pump's heat moved per unit of work. */
export const HEAT_PUMP_COP = { value: 2.5, source: 'air-to-air heat pumps: COP about 2 to 4 across −20 to 7 °C outside (EN 14511 ratings; estimate at the cold end)', confidence: 'estimate' as const };
/** What a heat-recovery ventilation unit gives back of the heat the exchanged air carries out. */
export const HEAT_RECOVERY = { value: 0.8, source: 'counterflow heat-recovery ventilation: 75 to 90 % (Passive House certified units; estimate)', confidence: 'estimate' as const };
/** Light out over power in, for white LED fittings. */
export const LED_RADIANT_EFFICIENCY = { value: 0.35, source: 'white LED fittings turn about 30 to 45 % of their power into light (US DOE SSL programme; estimate)', confidence: 'estimate' as const };
/** A strip footing's least practical width and depth. */
export const STRIP_FOOTING = { width: 0.3, depth: 0.2, source: 'strip footings for light frame walls about 300 mm wide and 200 mm deep at the least (IRC R403.1 tables; estimate)', confidence: 'estimate' as const };
/** Rain a vertical downpipe carries. */
export const DOWNPIPE = { d: 0.08, q: 2e-3, source: 'an 80 mm downpipe carries about 2 L/s (EN 12056-3, table 8; estimate)', confidence: 'estimate' as const };
/** Sheet goods a frame is clad in. */
export const BOARDS = { osb: { t: 0.018, density: 600 }, sheathing: { t: 0.012, density: 600 }, plasterboard: { t: 0.0125, density: 700 }, source: 'OSB/3 to EN 300, gypsum board to EN 520 (typical thicknesses and densities)', confidence: 'standard' as const };
/** A Li-ion cell made for current rather than energy. */
export const LI_ION_21700_POWER = { id: 'INR-21700-P42A', V: 3.6, Vmax: 4.2, Vmin: 2.5, Ah: 4.2, Imax: 45, mass: 0.07, d: 21.7 * mm, l: 70.4 * mm, source: 'Molicel INR-21700-P42A datasheet: 3.6 V nominal, 4.2 Ah, 45 A continuous, 70 g', confidence: 'datasheet' as const };
/** The cells a pack is made of: whichever makes it with the fewest. */
export const CELLS = [LI_ION_21700, LI_ION_21700_POWER];
/** The DC levels a bus is built at; up to 60 V is extra-low voltage, safe to touch dry. */
export const BUS_VOLTAGES = { levels: [12, 24, 48, 96, 400, 800, 1500, 3000], elv: 60, source: 'common DC bus levels: 12 to 96 V for small drives, 400 and 800 V for road traction, 1.5 and 3 kV for railways (EN 50163); up to 60 V DC is extra-low voltage (IEC 61140, class III), above it basic insulation and protection against contact are needed', confidence: 'standard' as const };
/** The most conductors run in parallel in one circuit before it is a busbar's work, not a cable's. */
export const PARALLEL_CONDUCTORS = { value: 12, source: 'large DC circuits run several cables in parallel per pole (IEC 60364-5-52, 523.7, equal conductors in parallel); kept to twelve here', confidence: 'estimate' as const };
/** How much of the friction a skid turn may use as lateral acceleration and still steer by scrubbing its tyres. */
export const SKID_TURN = { value: 0.1, source: 'skid-steered and tracked vehicles turn by sliding their tyres sideways, which uses the friction a curve would need: kept to about a tenth of μg (estimate)', confidence: 'estimate' as const };
/** Skin friction of a hull: the ITTC 1957 model-ship correlation line. */
export const ITTC_1957 = { cf: (Re: number) => 0.075 / (Math.log10(Re) - 2) ** 2, source: 'ITTC 1957 friction line: C_F = 0.075 / (log10 Re − 2)²', confidence: 'standard' as const };
/** How a hull's resistance stands to its weight past displacement speed, by Froude number: over the hump, then planing. */
export const PLANING = { hump: 0.18, planing: 0.12, source: 'resistance over weight about 0.15 to 0.2 at the hump (Froude 0.4 to 1) and 0.1 to 0.13 planing (Savitsky 1964; estimate)', confidence: 'estimate' as const };
/** A small hull's form: block coefficient, form factor, the least plate and the spacing of its frames. */
export const HULL = { cb: 0.45, formFactor: 0.25, plate: 4e-3, frames: 0.5, freeboard: 0.35, lengthOverBeam: 3, draftOverBeam: 0.35, source: 'small craft: block coefficient about 0.35 to 0.55, form factor 1 + k about 1.2 to 1.3, aluminium bottom plate at least 4 mm and frames about 500 mm apart (ISO 12215-5 minimums), length about 3 beams and draft about a third of the beam for small craft (estimate)', confidence: 'estimate' as const };
/** A propeller: the share of the ideal efficiency a real one gets, and its advance ratio. */
export const PROPELLER = { ofIdeal: 0.75, advance: 0.8, source: 'open propellers reach about 70 to 80 % of the actuator-disc ideal efficiency, at advance ratios about 0.6 to 1 (Carlton, Marine Propellers and Propulsion; estimate)', confidence: 'estimate' as const };

/** Petrol, as a store: what a kilogram holds, how dense it is, and the air it takes to burn. */
export const FUEL = { lhv: 4.3e7, density: 745, afr: 14.7, source: 'petrol: about 43 MJ/kg lower heating value, 720 to 775 kg/m³, burning with 14.7 kg of air a kg at the stoichiometric ratio', confidence: 'standard' as const };
/** An engine turning a generator: how much of the fuel's energy reaches the bus, and how much it weighs a watt. */
export const GENSET = { efficiency: 0.25, specificPower: 200, tankPerLitre: 0.15, density: 1200, source: 'small spark-ignition engine-generators turn about a fifth to a third of the fuel\'s energy into charge; a 2.2 kW portable set weighs about 21 kg and a 28 kW range extender about 120 kg, 0.1 to 0.25 kW/kg; a moulded tank about 0.15 kg a litre (estimates)', confidence: 'estimate' as const };
/** A solar module on a vehicle: what it makes of the sun, and what it weighs. */
export const SOLAR = { efficiency: 0.2, arealMass: 3, source: 'monocrystalline silicon modules turn about 20 % of sunlight into charge at 1000 W/m²; flexible ones weigh about 2 to 4 kg/m² (estimates)', confidence: 'estimate' as const };
