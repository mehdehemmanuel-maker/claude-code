// Batteries as their makers publish them, and the copper wire that carries their current. A battery holds a real amount
// of charge, gives less of it the faster it is drawn (its maker's own capacity table, not a formula), sags under load
// by its internal resistance, and is flat when its voltage under load falls to the end voltage its maker rates it to.



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
