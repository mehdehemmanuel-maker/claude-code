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
export const BREADBOARD = { pitch: 2.54 * mm, rows: 63, rails: 4, width: 55 * mm, length: 165 * mm, source: 'the common 830-point solderless breadboard', confidence: 'maker' as Confidence };

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
