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

// ---- transmissions ---------------------------------------------------------------------------------------------------

/** GT2 timing belts and pulleys: a 2 mm pitch; the pitch diameter of a z-tooth pulley is z × pitch / π. */
export const GT2 = { pitch: 2 * mm, widths: [6 * mm, 9 * mm, 10 * mm], teeth: [16, 20, 30, 36, 40, 60], bores: [5 * mm, 8 * mm], source: 'Gates PowerGrip GT2 2 mm pitch', confidence: 'maker' as Confidence };

// ---- conductors and their insulation --------------------------------------------------------------------------------

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

// ---- for anything that moves, flies, holds heat or carries water -------------------------------------------------
/** A Li-ion cell as its maker rates it. */
export const LI_ION_21700 = { id: 'INR21700-50E', V: 3.6, Vmax: 4.2, Vmin: 2.5, Ah: 4.9, Imax: 9.8, mass: 0.0685, d: 21.25 * mm, l: 70.8 * mm, source: 'Samsung SDI INR21700-50E datasheet: 3.6 V nominal, 4.9 Ah, 9.8 A continuous, 68.5 g, Ø21.25 × 70.8 mm', confidence: 'datasheet' as const };
/** Sheet goods a frame is clad in. */
export const BOARDS = { osb: { t: 0.018, density: 600 }, sheathing: { t: 0.012, density: 600 }, plasterboard: { t: 0.0125, density: 700 }, source: 'OSB/3 to EN 300, gypsum board to EN 520 (typical thicknesses and densities)', confidence: 'standard' as const };
/** A Li-ion cell made for current rather than energy. */
export const LI_ION_21700_POWER = { id: 'INR-21700-P42A', V: 3.6, Vmax: 4.2, Vmin: 2.5, Ah: 4.2, Imax: 45, mass: 0.07, d: 21.7 * mm, l: 70.4 * mm, source: 'Molicel INR-21700-P42A datasheet: 3.6 V nominal, 4.2 Ah, 45 A continuous, 70 g', confidence: 'datasheet' as const };
/** The cells a pack is made of: whichever makes it with the fewest. */
export const CELLS = [LI_ION_21700, LI_ION_21700_POWER];

/** Petrol, as a store: what a kilogram holds, how dense it is, and the air it takes to burn. */
export const FUEL = { lhv: 4.3e7, density: 745, afr: 14.7, source: 'petrol: about 43 MJ/kg lower heating value, 720 to 775 kg/m³, burning with 14.7 kg of air a kg at the stoichiometric ratio', confidence: 'standard' as const };
