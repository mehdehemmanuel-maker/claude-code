// Mixes given as what goes into one cubic metre: so their density is the sum of their parts' masses (worked out, not
// typed), and what they are made of follows from their parts. A mix here is a typical proportioning, not a supplier's
// mix design: it says so.

export interface Mix { name: string; per: 'm^3'; parts: [id: string, kg: number][]; source: string }

export const MIXES: Record<string, Mix> = {
  // water to cement 0.50; about 25 to 30 MPa at 28 days, normal-weight aggregate
  'concrete-c25': { name: 'normal-weight concrete, about 25 MPa, plain (no reinforcing)', per: 'm^3', parts: [['portland-cement', 330], ['water', 165], ['sand-quartz', 750], ['granite', 1090]], source: 'a typical mix of the kind ACI 211.1 proportions (w/c 0.50); not a supplier\'s mix design' },
};
/** A mix's density, kg/m³: its parts' masses in its cubic metre, summed. */
export const mixDensity = (m: Mix): number => m.parts.reduce((a, [, kg]) => a + kg, 0);

/** A material made of phases mixed so (src/nexus/mixture.ts works out its properties from theirs): by volume or mass
 *  fraction, how the phases are arranged, which is continuous (the matrix), and for a foam how much of it is pores. Each
 *  is a common make of its kind, not one supplier's. */
export interface Mixture { name: string; phases: [id: string, frac: number][]; by: 'volume' | 'mass'; arrangement: 'particles' | 'aligned fibres' | 'random fibres' | 'woven' | 'layers' | 'grains' | 'open foam' | 'solid solution'; matrix?: string; porosity?: number; gas?: string; family: 'composite' | 'foam' | 'concrete and mortar' }
export const MIXTURES: Record<string, Mixture> = {
  'cfrp-ud-60': { name: 'carbon fibre and epoxy, unidirectional, 60 % fibre by volume', phases: [['carbon-fibre-t300', 0.6], ['epoxy', 0.4]], by: 'volume', arrangement: 'aligned fibres', matrix: 'epoxy', family: 'composite' },
  'gfrp-random-30': { name: 'chopped glass fibre and epoxy, random in a plane, 30 % fibre by volume', phases: [['e-glass', 0.3], ['epoxy', 0.7]], by: 'volume', arrangement: 'random fibres', matrix: 'epoxy', family: 'composite' },
  'gfrp-woven-50': { name: 'woven glass and epoxy laminate, 50 % glass by volume (as circuit-board laminate is)', phases: [['e-glass', 0.5], ['epoxy', 0.5]], by: 'volume', arrangement: 'woven', matrix: 'epoxy', family: 'composite' },
  'al-sic-20': { name: 'aluminium 6061 with 20 % silicon carbide particles by volume (a metal-matrix composite)', phases: [['al-6061', 0.8], ['silicon-carbide', 0.2]], by: 'volume', arrangement: 'particles', matrix: 'al-6061', family: 'composite' },
  'thermal-paste-60': { name: 'thermal paste: alumina particles in silicone, 60 % by volume', phases: [['silicone', 0.4], ['alumina', 0.6]], by: 'volume', arrangement: 'particles', matrix: 'silicone', family: 'composite' },
  'concrete-aggregate-70': { name: 'concrete as its phases: granite aggregate in hardened cement paste, 70 % aggregate by volume', phases: [['cement-paste', 0.3], ['granite', 0.7]], by: 'volume', arrangement: 'particles', matrix: 'cement-paste', family: 'concrete and mortar' },
  'al-foam-10': { name: 'open-cell aluminium foam, 10 % dense', phases: [['al-6061', 1]], by: 'volume', arrangement: 'open foam', porosity: 0.9, gas: 'air', family: 'foam' },
};
