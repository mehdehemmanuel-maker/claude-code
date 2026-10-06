// What framing can be made of: the dressed sections sawn lumber is sold in, and the kept woods that are dressed to
// them. The availability is a fact about what can be had, never a choice: the generator picks among it.

/** Dressed sawn-lumber sections, thickness × width in m (PS 20 American Softwood Lumber Standard: a 2×4 is 38 × 89 mm). */
export const LUMBER: Record<string, [number, number]> = {
  '1x4': [0.019, 0.089], '1x6': [0.019, 0.14], '2x2': [0.038, 0.038], '2x4': [0.038, 0.089],
  '2x6': [0.038, 0.14], '2x8': [0.038, 0.184], '2x10': [0.038, 0.235], '2x12': [0.038, 0.286], '4x4': [0.089, 0.089],
};
export const LUMBER_SOURCE = 'dressed sawn-lumber sizes (PS 20 American Softwood Lumber Standard: a 2×4 is 38 × 89 mm)';

/** The kept woods dressed to those sizes: PS 20 covers softwoods. The kept hardwoods are sold rough, by thickness in quarters; balsa in blocks and sheets. */
export const DRESSED_SPECIES = ['wood.douglas-fir', 'wood.southern-pine', 'wood.white-pine'];
export const DRESSED_SOURCE = 'PS 20 American Softwood Lumber Standard: its dressed sizes are for softwood species; hardwood lumber is sold rough (NHLA rules, thickness in quarters)';
