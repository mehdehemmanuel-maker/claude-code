// Batteries as their makers publish them, and the copper wire that carries their current. A battery holds a real amount
// of charge, gives less of it the faster it is drawn (its maker's own capacity table, not a formula), sags under load
// by its internal resistance, and is flat when its voltage under load falls to the end voltage its maker rates it to.

import type { Price } from './motors';

export interface BatteryData {
  id: string;
  label: string;
  chemistry: 'lead-acid-vrla' | 'nimh';
  /** Cells in series in one block, and the block's nominal voltage. */
  cells: number;
  V: number;
  /** The maker's capacity table: hours to discharge at a constant current, the Ah it gave, and the end voltage per cell. */
  capacity: { hours: number; Ah: number; endPerCell: number }[];
  /** Internal resistance of a charged block, ohm. */
  internalR: number;
  mass: number;
  /** Block size, m: length, width, height over the terminals. */
  dims: [number, number, number];
  /** What it is made of, inside, as its maker describes it: each sub-component and what it does. */
  construction: { part: string; is: string }[];
  /** The cell reaction: what is spent while it gives charge (and made again when charged). */
  reaction: string;
  price?: Price;
  source: string;
}

export const BATTERIES: Record<string, BatteryData> = {
  'battery.nimh.aa': {
    id: 'battery.nimh.aa', label: 'NiMH AA cell, 1.2 V 2000 mAh (in a holder)', chemistry: 'nimh', cells: 1, V: 1.2,
    capacity: [
      { hours: 5, Ah: 2.0, endPerCell: 1.0 },
      { hours: 1, Ah: 1.9, endPerCell: 1.0 },
      { hours: 0.33, Ah: 1.7, endPerCell: 0.9 },
    ],
    internalR: 0.025, mass: 0.03, dims: [0.0505, 0.0145, 0.0145],
    construction: [
      { part: 'Positive electrode', is: 'nickel oxyhydroxide (NiOOH) on a sintered or foam nickel substrate' },
      { part: 'Negative electrode', is: 'a hydrogen-absorbing alloy (AB5, a mischmetal-nickel alloy) holding hydrogen as a metal hydride' },
      { part: 'Separator', is: 'a polyolefin non-woven, holding the electrolyte' },
      { part: 'Electrolyte', is: 'potassium hydroxide (KOH) solution, about 30%' },
      { part: 'Case', is: 'a nickel-plated steel can, 14.5 mm by 50.5 mm, with a resealing vent; in a plastic holder with spring contacts' },
    ],
    reaction: 'NiOOH + MH → Ni(OH)2 + M on discharge (reversed on charge): hydrogen moves from the alloy to the nickel electrode',
    source: 'the common 2000 mAh AA NiMH cell class datasheet: 1.2 V nominal, about 2.0 Ah at 0.2 C to 1.0 V, 1.9 Ah at 1 C, 1.7 Ah at 3 C, about 25 mΩ, 30 g, 14.5 × 50.5 mm; the open-circuit curve (1.25 V flat, rising to 1.40 V full) is an estimate of its shape',
  },
  'battery.nimh.aaa': {
    id: 'battery.nimh.aaa', label: 'NiMH AAA cell, 1.2 V 800 mAh (in a holder)', chemistry: 'nimh', cells: 1, V: 1.2,
    capacity: [
      { hours: 5, Ah: 0.8, endPerCell: 1.0 },
      { hours: 1, Ah: 0.75, endPerCell: 1.0 },
      { hours: 0.33, Ah: 0.65, endPerCell: 0.9 },
    ],
    internalR: 0.04, mass: 0.012, dims: [0.0445, 0.0105, 0.0105],
    construction: [
      { part: 'Positive electrode', is: 'nickel oxyhydroxide (NiOOH) on a sintered or foam nickel substrate' },
      { part: 'Negative electrode', is: 'a hydrogen-absorbing alloy (AB5, a mischmetal-nickel alloy) holding hydrogen as a metal hydride' },
      { part: 'Separator', is: 'a polyolefin non-woven, holding the electrolyte' },
      { part: 'Electrolyte', is: 'potassium hydroxide (KOH) solution, about 30%' },
      { part: 'Case', is: 'a nickel-plated steel can, 14.5 mm by 50.5 mm, with a resealing vent; in a plastic holder with spring contacts' },
    ],
    reaction: 'NiOOH + MH → Ni(OH)2 + M on discharge (reversed on charge): hydrogen moves from the alloy to the nickel electrode',
    source: 'the common 800 mAh AAA NiMH cell class datasheet: 1.2 V nominal, about 0.8 Ah at 0.2 C to 1.0 V, 0.75 Ah at 1 C, 0.65 Ah at 3 C, about 40 mΩ, 12 g, 10.5 × 44.5 mm; the open-circuit curve is the AA cell\'s, an estimate of its shape',
  },
  'battery.sla.12v-7ah': {
    id: 'battery.sla.12v-7ah', label: 'Sealed lead-acid (AGM) battery, 12 V 7 Ah, F1 terminals', chemistry: 'lead-acid-vrla', cells: 6, V: 12,
    capacity: [
      { hours: 20, Ah: 7.0, endPerCell: 1.75 },
      { hours: 10, Ah: 6.4, endPerCell: 1.75 },
      { hours: 5, Ah: 5.9, endPerCell: 1.7 },
      { hours: 1, Ah: 4.2, endPerCell: 1.6 },
    ],
    internalR: 0.023, mass: 2.65, dims: [0.151, 0.065, 0.0975],
    construction: [
      { part: 'Cells', is: 'six 2 V lead-acid cells in series, each its own compartment of the case' },
      { part: 'Grids', is: 'lead-calcium alloy (with tin and primary lead where it matters), holding the active material and carrying the current' },
      { part: 'Positive plates', is: 'lead dioxide (PbO2) pasted on the grids' },
      { part: 'Negative plates', is: 'sponge lead (Pb) pasted on the grids' },
      { part: 'Separator', is: 'microfine glass mat (AGM) between the plates: insulates them and holds all the electrolyte, so none is free to spill' },
      { part: 'Electrolyte', is: 'dilute sulphuric acid (H2SO4), its strength (specific gravity about 1.30 charged, 1.10 flat) setting each cell\'s voltage' },
      { part: 'Vent valve', is: 'a low-pressure valve per cell: releases gas on severe overcharge, then reseals (valve-regulated, VRLA)' },
      { part: 'Case and lid', is: 'ABS (the NP-FR version flame-retardant, UL94 V-0), with F1 (4.8 mm) faston terminals' },
    ],
    reaction: 'PbO2 + Pb + 2 H2SO4 → 2 PbSO4 + 2 H2O on discharge (reversed on charge): the acid is used up as it gives charge, which is why its voltage falls with it',
    price: { amount: 28.99, currency: 'USD', seen: '2026-10', note: 'ATBatt, one block (Walmart $33.25; Amazon $54.99 for two)' },
    source: 'Yuasa NP7-12 datasheet (capacities at 20 °C: 20 h 7.0 Ah, 10 h 6.4 Ah, 5 h 5.9 Ah, 1 h 4.2 Ah; internal resistance about 23 mΩ; 2.65 kg; 151 × 65 × 97.5 mm)',
  },
};

export const getBattery = (id: string) => BATTERIES[id === 'yuasa.np7-12' ? 'battery.sla.12v-7ah' : id] ?? BATTERIES['battery.sla.12v-7ah']!;

/**
 * Stranded copper wire by AWG: resistance per metre of one conductor at 20 C (ohm/m), copper area (m^2), and what it
 * carries in chassis wiring, A (the usual chassis-wiring ampacity for a single conductor in free air).
 */
export const WIRE_GAUGES: Record<string, { ohmPerM: number; area: number; ampacity: number }> = {
  '10': { ohmPerM: 0.003277, area: 5.26e-6, ampacity: 55 },
  '12': { ohmPerM: 0.005211, area: 3.31e-6, ampacity: 41 },
  '14': { ohmPerM: 0.008286, area: 2.08e-6, ampacity: 32 },
  '16': { ohmPerM: 0.01317, area: 1.31e-6, ampacity: 22 },
  '18': { ohmPerM: 0.02095, area: 0.823e-6, ampacity: 16 },
};

/**
 * Starting batteries by their BCI group: the case's size is the standard (BCI, Battery Council International, group size
 * chart: length, width, height over the terminals, in inches, here in metres); what goes inside is typical of a flooded
 * lead-acid SLI battery (starting, lighting, ignition), not any one maker's. Its mass and cold-cranking amps are typical of
 * the group (makers' listings vary with their plates). Where it is commonly fitted is said as typical.
 */
export interface BciGroup { group: string; dims: [number, number, number]; kg: number; cca: number; Ah: number; /** plates in each of its six cells, typical */ plates: number; fits: string }
const IN = 0.0254;
export const BCI_GROUPS: Record<string, BciGroup> = {
  '35': { group: '35', dims: [9.0625 * IN, 6.875 * IN, 8.875 * IN], kg: 17, cca: 550, Ah: 50, plates: 13, fits: 'many Japanese cars (Toyota, Honda, Nissan): typical' },
  '24F': { group: '24F', dims: [10.25 * IN, 6.8125 * IN, 8.875 * IN], kg: 19, cca: 650, Ah: 60, plates: 15, fits: 'many cars and light trucks (its terminals reversed from a 24): typical' },
  '48': { group: '48', dims: [10.9375 * IN, 6.875 * IN, 7.5 * IN], kg: 19, cca: 690, Ah: 70, plates: 15, fits: 'European and many newer American cars (also called H6): typical' },
  '65': { group: '65', dims: [12.0625 * IN, 7.5 * IN, 7.5625 * IN], kg: 22, cca: 750, Ah: 75, plates: 17, fits: 'Ford and Lincoln cars and pickups: typical' },
  '31': { group: '31', dims: [13 * IN, 6.8125 * IN, 9.4375 * IN], kg: 27, cca: 950, Ah: 100, plates: 19, fits: 'heavy trucks (three or four in a highway tractor\'s battery box), buses, boats: typical' },
  '51R': { group: '51R', dims: [9.375 * IN, 5.0625 * IN, 8.8125 * IN], kg: 13, cca: 450, Ah: 45, plates: 11, fits: 'small Honda and Mazda cars: typical' },
};

/**
 * Cylindrical lithium-ion cells by their format (diameter and length in tenths of a millimetre: an 18650 is 18 mm by 65 mm).
 * Size and mass from makers' datasheets where the format is sold (the 18650 and 21700), from published teardowns where it
 * is not (the 4680); what is wound inside is typical of NMC cells (estimates of each layer's thickness).
 */
export interface CellFormat { id: string; d: number; L: number; kg: number; Ah: number; V: number; /** the can's wall, m (typical) */ wall: number; source: string }
export const CELL_FORMATS: Record<string, CellFormat> = {
  '18650': { id: '18650', d: 0.0184, L: 0.065, kg: 0.047, Ah: 2.5, V: 3.6, wall: 0.00025, source: 'makers\' datasheets (Samsung INR18650-25R: 18.33 × 64.85 mm, 45 g, 2.5 Ah; LG and Sony cells alike within a few grams)' },
  '21700': { id: '21700', d: 0.0212, L: 0.0702, kg: 0.068, Ah: 5.0, V: 3.6, wall: 0.0003, source: 'makers\' datasheets (Samsung INR21700-50E: 21.25 × 70.8 mm, 69 g, 4.9 Ah; LG INR21700-M50 alike), the format of Tesla\'s Model 3 and Y packs' },
  '4680': { id: '4680', d: 0.046, L: 0.08, kg: 0.355, Ah: 23, V: 3.6, wall: 0.0005, source: 'published teardowns of Tesla\'s 4680 cell (46 × 80 mm, about 355 g, about 23 Ah: reported, not a maker\'s datasheet)' },
};
