// What wood is made of, at the level below the board: a solid (the cell wall) and room (the cells' hollows), arranged
// as long cells along the stem. These are measurements kept as evidence: the arrangement's laws are derived elsewhere
// (src/nexus/substrate/network.ts, src/nexus/substrate/frame.ts) and checked against them, never fitted to them.

/** The cell wall's own density, whatever the species: wood's density over it is the solid's share of the volume. */
export const CELL_WALL_DENSITY = { value: 1500, unit: 'kg/m^3', source: 'USDA Wood Handbook FPL-GTR-282 ch. 4: the specific gravity of the cell-wall substance is about 1.5 for all species; Gibson & Ashby, Cellular Solids (1997) ch. 10: 1500 kg/m³' };

/** The cell wall's stiffness along the cell, measured on the wall itself: an independent check on what whole wood implies. */
export const CELL_WALL_MODULUS_ALONG = { value: 35e9, unit: 'Pa', source: 'Gibson & Ashby, Cellular Solids (1997) ch. 10, Table 10.1: the cell wall\'s Young\'s modulus along the cell, about 35 GPa' };

/** E_L is about the static-bending modulus raised by a tenth, which takes out the shear the bending test includes. */
export const ALONG_FROM_BENDING = { value: 1.1, unit: '1', source: 'USDA Wood Handbook FPL-GTR-282 Table 5-1, note: E_L may be approximated by increasing the modulus of elasticity values in Table 5-3 by 10%' };

/** Measured stiffness across the grain over along it, tangential and radial, for the kept woods that Table 5-1 lists (about 12 % moisture). */
export const ELASTIC_RATIOS: Record<string, { ET: number; ER: number; as: string }> = {
  'wood.balsa': { ET: 0.015, ER: 0.046, as: 'Balsa' },
  'wood.douglas-fir': { ET: 0.050, ER: 0.068, as: 'Douglas-fir' },
  'wood.southern-pine': { ET: 0.078, ER: 0.113, as: 'Pine, loblolly' },
  'wood.red-oak': { ET: 0.082, ER: 0.154, as: 'Oak, red' },
  'wood.white-oak': { ET: 0.072, ER: 0.163, as: 'Oak, white' },
  'wood.hard-maple': { ET: 0.065, ER: 0.132, as: 'Maple, sugar' },
};
export const ELASTIC_RATIOS_SOURCE = 'USDA Wood Handbook FPL-GTR-282 (2021), Table 5-1: elastic ratios for various species at approximately 12% moisture content';
