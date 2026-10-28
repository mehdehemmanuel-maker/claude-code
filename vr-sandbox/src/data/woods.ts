// Wood species, by the USDA Wood Handbook (FPL-GTR-282, 2021), Table 5-3a: clear, straight-grained wood at 12 %
// moisture. Specific gravity is the oven-dry mass over the volume at 12 % moisture, so its density at 12 % moisture is
// ρ = 1000 G (1 + 0.12) (Wood Handbook eq. 4-1). Strengths are of small clear specimens: lumber of a grade, with its
// knots and slope of grain, is weaker, and its design values come from its grading rules, not these.

export interface Wood { name: string; botanical: string; kind: 'softwood' | 'hardwood'; G12: number; MOE: number; MOR: number; source: string }
const WH = 'USDA Forest Products Laboratory, Wood Handbook (FPL-GTR-282, 2021), Table 5-3a, at 12 % moisture';

export const WOODS: Record<string, Wood> = {
  'douglas-fir': { name: 'Douglas-fir (coast)', botanical: 'Pseudotsuga menziesii', kind: 'softwood', G12: 0.48, MOE: 13.4e9, MOR: 85e6, source: WH },
  'red-oak': { name: 'northern red oak', botanical: 'Quercus rubra', kind: 'hardwood', G12: 0.63, MOE: 12.5e9, MOR: 99e6, source: WH },
};
/** Density at 12 % moisture, kg/m³: worked out from its specific gravity (Wood Handbook eq. 4-1). */
export const woodDensity = (w: Wood): number => 1000 * w.G12 * 1.12;
