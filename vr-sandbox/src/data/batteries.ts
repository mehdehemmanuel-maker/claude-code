// Batteries as their makers publish them, and the copper wire that carries their current. A battery holds a real amount
// of charge, gives less of it the faster it is drawn (its maker's own capacity table, not a formula), sags under load
// by its internal resistance, and is flat when its voltage under load falls to the end voltage its maker rates it to.

import type { Price } from './motors';

export interface BatteryData {
  id: string;
  label: string;
  chemistry: 'lead-acid-vrla';
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
  'yuasa.np7-12': {
    id: 'yuasa.np7-12', label: 'Yuasa NP7-12, 12 V 7 Ah sealed lead-acid', chemistry: 'lead-acid-vrla', cells: 6, V: 12,
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

export const getBattery = (id: string) => BATTERIES[id] ?? BATTERIES['yuasa.np7-12']!;

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
