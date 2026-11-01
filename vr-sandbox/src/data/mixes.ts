// Mixes given as what goes into one cubic metre: so their density is the sum of their parts' masses (worked out, not
// typed), and what they are made of follows from their parts. A mix here is a typical proportioning, not a supplier's
// mix design: it says so.

export interface Mix { name: string; per: 'm^3'; parts: [id: string, kg: number][]; source: string; /** its claim status (spec 10, T3) */ status: string }

export const MIXES: Record<string, Mix> = {
  // water to cement 0.50; about 25 to 30 MPa at 28 days, normal-weight aggregate
  'concrete-c25': { name: 'normal-weight concrete, about 25 MPa, plain (no reinforcing)', status: 'estimated', per: 'm^3', parts: [['portland-cement', 330], ['water', 165], ['sand-quartz', 750], ['granite', 1090]], source: 'a typical mix of the kind ACI 211.1 proportions (w/c 0.50); not a supplier\'s mix design' },
};
/** A mix's density, kg/m³: its parts' masses in its cubic metre, summed. */
export const mixDensity = (m: Mix): number => m.parts.reduce((a, [, kg]) => a + kg, 0);

/** A material made of phases mixed so (src/nexus/mixture.ts works out its properties from theirs): by volume or mass
 *  fraction, how the phases are arranged, which is continuous (the matrix), and for a foam how much of it is pores. Each
 *  is a common make of its kind, not one supplier's. */
export interface Mixture { /** its claim status (spec 10, T3), where its phases' own do not give it */ status?: string; /** where its figures come from, where they are not a phase's own: derived (worked out here) or a chosen example */ basis?: string; name: string; phases: [id: string, frac: number][]; by: 'volume' | 'mass'; arrangement: 'particles' | 'aligned fibres' | 'random fibres' | 'woven' | 'layers' | 'grains' | 'open foam' | 'solid solution'; matrix?: string; porosity?: number; gas?: string; family: 'composite' | 'foam' | 'concrete and mortar' }
export const MIXTURES: Record<string, Mixture> = {
  'cfrp-ud-60': { status: 'estimated', basis: 'a typical proportion of its kind, chosen as an example, not one maker\'s figure', name: 'carbon fibre and epoxy, unidirectional, 60 % fibre by volume', phases: [['carbon-fibre-t300', 0.6], ['epoxy', 0.4]], by: 'volume', arrangement: 'aligned fibres', matrix: 'epoxy', family: 'composite' },
  'gfrp-random-30': { status: 'estimated', basis: 'a typical proportion of its kind, chosen as an example, not one maker\'s figure', name: 'chopped glass fibre and epoxy, random in a plane, 30 % fibre by volume', phases: [['e-glass', 0.3], ['epoxy', 0.7]], by: 'volume', arrangement: 'random fibres', matrix: 'epoxy', family: 'composite' },
  'gfrp-woven-50': { status: 'estimated', basis: 'a typical proportion of its kind, chosen as an example, not one maker\'s figure', name: 'woven glass and epoxy laminate, 50 % glass by volume (as circuit-board laminate is)', phases: [['e-glass', 0.5], ['epoxy', 0.5]], by: 'volume', arrangement: 'woven', matrix: 'epoxy', family: 'composite' },
  'al-sic-20': { status: 'estimated', basis: 'a typical proportion of its kind, chosen as an example, not one maker\'s figure', name: 'aluminium 6061 with 20 % silicon carbide particles by volume (a metal-matrix composite)', phases: [['al-6061', 0.8], ['silicon-carbide', 0.2]], by: 'volume', arrangement: 'particles', matrix: 'al-6061', family: 'composite' },
  'thermal-paste-60': { status: 'estimated', basis: 'a typical proportion of its kind, chosen as an example, not one maker\'s figure', name: 'thermal paste: alumina particles in silicone, 60 % by volume', phases: [['silicone', 0.4], ['alumina', 0.6]], by: 'volume', arrangement: 'particles', matrix: 'silicone', family: 'composite' },
  'concrete-aggregate-70': { status: 'estimated', basis: 'a typical proportion of its kind, chosen as an example, not one maker\'s figure', name: 'concrete as its phases: granite aggregate in hardened cement paste, 70 % aggregate by volume', phases: [['cement-paste', 0.3], ['granite', 0.7]], by: 'volume', arrangement: 'particles', matrix: 'cement-paste', family: 'concrete and mortar' },
  // what was a typed density, worked out from its phases
  'pa66-gf30': { status: 'estimated', basis: 'a typical proportion of its kind, chosen as an example, not one maker\'s figure', name: 'polyamide 66 with 30 % short glass fibre by mass (injection moulded: the fibres taken as random in the plane)', phases: [['pa66', 0.7], ['e-glass', 0.3]], by: 'mass', arrangement: 'random fibres', matrix: 'pa66', family: 'composite' },
  fr4: { status: 'estimated', basis: 'a typical proportion of its kind, chosen as an example, not one maker\'s figure', name: 'FR-4: woven E-glass in epoxy, about 50 % glass by volume', phases: [['e-glass', 0.5], ['epoxy', 0.5]], by: 'volume', arrangement: 'woven', matrix: 'epoxy', family: 'composite' },
  'glass-wool': { name: 'glass wool insulation, 24 kg/m³ (E-glass fibres in air; radiation through it left out, so it conducts a little more than said)', phases: [['e-glass', 1]], by: 'volume', arrangement: 'open foam', porosity: 1 - 24 / 2540, gas: 'air', status: 'derived', basis: 'derived: its porosity from its stated 24 kg/m³ over E-glass at 2540 kg/m³', family: 'foam' },
  // the 25 MPa concrete's own recipe (MIXES) as its hardened phases: cement 330 kg / 3150 and water 165 kg as paste,
  // sand 750 / 2650, granite 1090 / 2700, and the 4.35 % of its cubic metre none of them fill as air
  'concrete-c25': { status: 'estimated', basis: 'worked out from the 25 MPa mix\'s recipe above (MIXES), itself a typical mix', name: 'normal-weight concrete, about 25 MPa, as its hardened phases', phases: [['cement-paste', 0.2698], ['sand-quartz', 0.2830], ['granite', 0.4037], ['air', 0.0435]], by: 'volume', arrangement: 'particles', matrix: 'cement-paste', family: 'concrete and mortar' },
  'al-foam-10': { name: 'open-cell aluminium foam, 10 % dense', status: 'hypothetical', basis: 'a chosen example: 10 % dense, said in its name, not one maker\'s product', phases: [['al-6061', 1]], by: 'volume', arrangement: 'open foam', porosity: 0.9, gas: 'air', family: 'foam' },
};
