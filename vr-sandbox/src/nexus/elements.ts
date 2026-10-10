// The fundamentals everything comes down to: the chemical elements. Every material of the inventory is made of them,
// by mass: an alloy by its grade's nominal composition (AISI 1020, 304, 6061, SAC305 …); a pure substance, a polymer or
// a ceramic exactly from its formula (PLA is C₃H₄O₂, alumina Al₂O₃); a blend from what it is a blend of (FR-4 is
// fibreglass and epoxy), each of those down to elements in turn. So every part's tree, followed far enough, ends in the
// same few dozen elements, and each element says where it is got from.

import { MOLECULES } from './life/molecules';

/** Standard atomic weights (IUPAC 2021, abridged), and where each element comes from. */
export const ELEMENTS: Record<string, { name: string; w: number; group: string; from: string }> = {
  H: { name: 'hydrogen', w: 1.008, group: 'Non-metals', from: 'water, split by electrolysis, and natural gas, by steam reforming' },
  Li: { name: 'lithium', w: 6.94, group: 'Metals', from: 'brine pools and spodumene ore' },
  B: { name: 'boron', w: 10.81, group: 'Metalloids', from: 'borax and kernite, mined from dry lake beds' },
  C: { name: 'carbon', w: 12.011, group: 'Non-metals', from: 'coal and coke; natural gas and crude oil, for plastics; and plants' },
  N: { name: 'nitrogen', w: 14.007, group: 'Non-metals', from: 'the air, distilled cold' },
  O: { name: 'oxygen', w: 15.999, group: 'Non-metals', from: 'the air, distilled cold, and every oxide ore' },
  F: { name: 'fluorine', w: 18.998, group: 'Non-metals', from: 'fluorite (fluorspar), mined' },
  Na: { name: 'sodium', w: 22.99, group: 'Metals', from: 'rock salt and sea salt' },
  Mg: { name: 'magnesium', w: 24.305, group: 'Metals', from: 'seawater, dolomite and magnesite' },
  Al: { name: 'aluminium', w: 26.982, group: 'Metals', from: 'bauxite, refined to alumina (the Bayer process), then smelted by electrolysis (Hall–Héroult)' },
  Si: { name: 'silicon', w: 28.085, group: 'Metalloids', from: 'quartz sand, reduced with carbon in an arc furnace' },
  P: { name: 'phosphorus', w: 30.974, group: 'Non-metals', from: 'phosphate rock' },
  S: { name: 'sulfur', w: 32.06, group: 'Non-metals', from: 'recovered from natural gas and crude oil' },
  Cl: { name: 'chlorine', w: 35.45, group: 'Non-metals', from: 'salt, split by electrolysis (chlor-alkali)' },
  Ar: { name: 'argon', w: 39.95, group: 'Non-metals', from: 'air, liquefied and distilled' },
  K: { name: 'potassium', w: 39.098, group: 'Metals', from: 'potash (sylvite), mined' },
  Ca: { name: 'calcium', w: 40.078, group: 'Metals', from: 'limestone' },
  Ti: { name: 'titanium', w: 47.867, group: 'Metals', from: 'ilmenite and rutile sands (the Kroll process)' },
  V: { name: 'vanadium', w: 50.942, group: 'Metals', from: 'the slag of smelting vanadium-bearing magnetite' },
  Cr: { name: 'chromium', w: 51.996, group: 'Metals', from: 'chromite ore' },
  Mn: { name: 'manganese', w: 54.938, group: 'Metals', from: 'pyrolusite and other manganese ores' },
  Fe: { name: 'iron', w: 55.845, group: 'Metals', from: 'iron ore (hematite, magnetite), smelted with coke in a blast furnace' },
  Co: { name: 'cobalt', w: 58.933, group: 'Metals', from: 'a by-product of copper and nickel mining' },
  Ni: { name: 'nickel', w: 58.693, group: 'Metals', from: 'pentlandite and laterite ores' },
  Cu: { name: 'copper', w: 63.546, group: 'Metals', from: 'chalcopyrite and other copper ores, smelted and refined by electrolysis' },
  Zn: { name: 'zinc', w: 65.38, group: 'Metals', from: 'sphalerite ore' },
  Ga: { name: 'gallium', w: 69.723, group: 'Metals', from: 'a by-product of refining bauxite' },
  As: { name: 'arsenic', w: 74.922, group: 'Metalloids', from: 'a by-product of smelting copper and gold ores' },
  Sr: { name: 'strontium', w: 87.62, group: 'Metals', from: 'celestine ore' },
  Zr: { name: 'zirconium', w: 91.224, group: 'Metals', from: 'zircon sand' },
  Mo: { name: 'molybdenum', w: 95.95, group: 'Metals', from: 'molybdenite ore, and a by-product of copper mining' },
  Ag: { name: 'silver', w: 107.87, group: 'Metals', from: 'a by-product of refining lead, zinc and copper' },
  Sn: { name: 'tin', w: 118.71, group: 'Metals', from: 'cassiterite ore' },
  Te: { name: 'tellurium', w: 127.6, group: 'Metalloids', from: 'a by-product of refining copper' },
  Ba: { name: 'barium', w: 137.33, group: 'Metals', from: 'barite ore' },
  Pr: { name: 'praseodymium', w: 140.91, group: 'Rare earths', from: 'rare-earth ores (bastnäsite, monazite), separated by solvent extraction' },
  Nd: { name: 'neodymium', w: 144.24, group: 'Rare earths', from: 'rare-earth ores (bastnäsite, monazite), separated by solvent extraction' },
  Dy: { name: 'dysprosium', w: 162.5, group: 'Rare earths', from: 'rare-earth ores, mostly ion-adsorption clays' },
  W: { name: 'tungsten', w: 183.84, group: 'Metals', from: 'wolframite and scheelite ores' },
  Au: { name: 'gold', w: 196.97, group: 'Metals', from: 'gold ore' },
  Pb: { name: 'lead', w: 207.2, group: 'Metals', from: 'galena ore' },
  Bi: { name: 'bismuth', w: 208.98, group: 'Metals', from: 'a by-product of refining lead' },
  Y: { name: 'yttrium', w: 88.906, group: 'Rare earths', from: 'rare-earth ores (xenotime, ion-adsorption clays), separated by solvent extraction' },
  Rh: { name: 'rhodium', w: 102.91, group: 'Metals', from: 'a by-product of refining platinum and nickel' },
  Ru: { name: 'ruthenium', w: 101.07, group: 'Metals', from: 'a by-product of refining platinum and nickel' },
  Cd: { name: 'cadmium', w: 112.41, group: 'Metals', from: 'a by-product of refining zinc ore' },
  In: { name: 'indium', w: 114.82, group: 'Metals', from: 'a by-product of refining zinc ore' },
  La: { name: 'lanthanum', w: 138.91, group: 'Rare earths', from: 'rare-earth ores (bastnäsite, monazite), separated by solvent extraction' },
  Ce: { name: 'cerium', w: 140.12, group: 'Rare earths', from: 'rare-earth ores (bastnäsite, monazite), separated by solvent extraction' },
  Pt: { name: 'platinum', w: 195.08, group: 'Metals', from: 'platinum ores (the Bushveld, Norilsk), and a by-product of refining nickel' },
  I: { name: 'iodine', w: 126.9, group: 'Non-metals', from: 'brine from gas and oil wells (Japan, the US) and caliche in Chile, where it comes with nitrate' },
};

/** A formula's mass fractions, %: "C3H4O2" (PLA's unit), "PbZr0.52Ti0.48O3" (PZT). */
export function formula(f: string): Record<string, number> {
  const atoms: Record<string, number> = {};
  for (const m of f.matchAll(/([A-Z][a-z]?)(\d*\.?\d*)/g)) { if (!m[1]) continue; const el = m[1]; if (!ELEMENTS[el]) throw new Error(`no element ${el} in ${f}`); atoms[el] = (atoms[el] ?? 0) + (m[2] ? Number(m[2]) : 1); }
  const total = Object.entries(atoms).reduce((a, [el, n]) => a + n * ELEMENTS[el]!.w, 0), out: Record<string, number> = {};
  for (const [el, n] of Object.entries(atoms)) out[el] = (100 * n * ELEMENTS[el]!.w) / total;
  return out;
}

/** What each material is made of, by mass %. An alloy: its elements, "bal" the balance; a formula: one string; a blend:
 *  [what, %] pairs, each a material of the inventory or a formula. */
type Spec = { alloy: Record<string, number | 'bal'>; grade: string } | { formula: string; says?: string } | { blend: [string, number][]; says: string };
export const MATERIALS: Record<string, Spec> = {
  'steel-low': { alloy: { C: 0.2, Mn: 0.45, Si: 0.2, Fe: 'bal' }, grade: 'AISI 1020, nominal' },
  'steel-alloy': { alloy: { C: 0.4, Mn: 0.85, Cr: 0.95, Mo: 0.2, Si: 0.25, Fe: 'bal' }, grade: 'AISI 4140, nominal' },
  'steel-spring': { alloy: { C: 0.85, Mn: 0.45, Si: 0.2, Fe: 'bal' }, grade: 'music wire (ASTM A228), nominal' },
  'steel-chrome': { alloy: { C: 1.0, Cr: 1.45, Mn: 0.35, Si: 0.25, Fe: 'bal' }, grade: 'AISI 52100, nominal' },
  'steel-tool': { alloy: { C: 0.95, Mn: 1.2, Cr: 0.5, W: 0.5, V: 0.2, Fe: 'bal' }, grade: 'AISI O1, nominal' },
  'stainless-304': { alloy: { Cr: 18.5, Ni: 9, Mn: 1.5, Si: 0.5, C: 0.05, Fe: 'bal' }, grade: 'AISI 304, nominal' },
  kovar: { alloy: { Ni: 29, Co: 17, Fe: 'bal' }, grade: 'ASTM F15 (Kovar), nominal' },
  'steel-electrical': { alloy: { Si: 3.2, Al: 0.5, Fe: 'bal' }, grade: 'silicon electrical steel, nominal' },
  'al-6061': { alloy: { Mg: 1.0, Si: 0.6, Cu: 0.28, Cr: 0.2, Fe: 0.35, Al: 'bal' }, grade: 'AA 6061, nominal' },
  'al-6063': { alloy: { Mg: 0.7, Si: 0.4, Fe: 0.2, Al: 'bal' }, grade: 'AA 6063, nominal' },
  'al-a380': { alloy: { Si: 8.5, Cu: 3.5, Zn: 1.5, Fe: 1.0, Mg: 0.1, Al: 'bal' }, grade: 'A380 die-casting alloy, nominal' },
  'al-foil': { alloy: { Fe: 0.4, Si: 0.25, Al: 'bal' }, grade: 'AA 1235, nominal' },
  copper: { alloy: { O: 0.04, Cu: 'bal' }, grade: 'C11000 (ETP), nominal' },
  'copper-foil': { alloy: { Cu: 'bal' }, grade: 'electrodeposited copper' },
  brass: { alloy: { Pb: 3, Fe: 0.35, Cu: 61.5, Zn: 'bal' }, grade: 'C36000 free-cutting brass, nominal' },
  bronze: { alloy: { Sn: 12, Cu: 'bal' }, grade: 'tin bronze, nominal' },
  'phosphor-bronze': { alloy: { Sn: 5, P: 0.2, Cu: 'bal' }, grade: 'C51000, nominal' },
  nickel: { alloy: { Ni: 'bal' }, grade: 'commercially pure' }, tin: { alloy: { Sn: 'bal' }, grade: 'commercially pure' }, zinc: { alloy: { Zn: 'bal' }, grade: 'commercially pure' },
  gold: { alloy: { Au: 'bal' }, grade: 'fine gold' }, silver: { alloy: { Ag: 'bal' }, grade: 'fine silver' },
  nichrome: { alloy: { Cr: 20, Ni: 'bal' }, grade: 'Nichrome 80/20' }, chromel: { alloy: { Cr: 10, Ni: 'bal' }, grade: 'Chromel (type K +)' }, alumel: { alloy: { Mn: 2, Al: 2, Si: 1, Ni: 'bal' }, grade: 'Alumel (type K −)' },
  solder: { alloy: { Ag: 3, Cu: 0.5, Sn: 'bal' }, grade: 'SAC305' },
  alnico: { alloy: { Co: 24, Ni: 14, Al: 8, Cu: 3, Fe: 'bal' }, grade: 'Alnico 5, nominal' },
  'nickel-alloy': { alloy: { Cr: 15.5, Fe: 8, Mn: 1, Si: 0.5, C: 0.15, Ni: 'bal' }, grade: 'Inconel 600, nominal' },
  ndfeb: { formula: 'Nd2Fe14B' }, 'ferrite-hard': { formula: 'SrFe12O19', says: 'strontium hexaferrite' }, 'ferrite-soft': { formula: 'Mn0.5Zn0.5Fe2O4', says: 'manganese-zinc ferrite' },
  pla: { formula: 'C3H4O2', says: 'polylactic acid, its repeat unit' }, pom: { formula: 'CH2O', says: 'polyoxymethylene' }, nylon: { formula: 'C6H11NO', says: 'nylon 6 and 6,6 alike' }, pc: { formula: 'C16H14O3', says: 'bisphenol-A polycarbonate' },
  pbt: { formula: 'C12H12O4' }, pp: { formula: 'C3H6' }, pe: { formula: 'C2H4' }, pvc: { formula: 'C2H3Cl' }, pmma: { formula: 'C5H8O2' }, ptfe: { formula: 'C2F4' }, polyimide: { formula: 'C22H10N2O5', says: 'Kapton' },
  silicone: { formula: 'C2H6OSi', says: 'polydimethylsiloxane' }, rubber: { formula: 'C5H8', says: 'polyisoprene (the polymer only: fillers and carbon black are a third of a tyre)' }, neoprene: { formula: 'C4H5Cl' }, phenolic: { formula: 'C7H6O', says: 'phenol-formaldehyde (Bakelite)' },
  pet: { formula: 'C10H8O4' }, paper: { formula: 'C6H10O5', says: 'cellulose' }, graphite: { formula: 'C' }, glue: { formula: 'C4H6O2', says: 'polyvinyl acetate wood glue, dry' },
  alumina: { formula: 'Al2O3' }, batio3: { formula: 'BaTiO3' }, pzt: { formula: 'PbZr0.52Ti0.48O3' }, mgo: { formula: 'MgO' }, 'ntc-ceramic': { formula: 'NiMn2O4', says: 'a nickel-manganese spinel' }, quartz: { formula: 'SiO2' },
  silicon: { formula: 'Si' }, gan: { formula: 'GaN' }, gaas: { formula: 'GaAs' }, nmc: { formula: 'LiNi0.333Mn0.333Co0.333O2', says: 'NMC 111' }, nitrogen: { formula: 'N2' }, water: { formula: 'H2O' }, bi2te3: { formula: 'Bi2Te3' }, sic: { formula: 'SiC' },
  mica: { formula: 'KAl3Si3O12H2', says: 'muscovite' }, oil: { formula: 'CH2', says: 'mineral oil, as (CH₂)ₙ' },
  abs: { blend: [['C3H3N', 25], ['C4H6', 20], ['C8H8', 55]], says: 'acrylonitrile, butadiene and styrene, typical shares' },
  nbr: { blend: [['C3H3N', 33], ['C4H6', 67]], says: 'acrylonitrile and butadiene' },
  pu: { blend: [['C15H10N2O2', 35], ['C3H6O', 65]], says: 'MDI and a polyether polyol, typical shares' },
  epoxy: { blend: [['C21H24O4', 80], ['C6H18N4', 20]], says: 'bisphenol-A resin and an amine hardener' },
  eva: { blend: [['pe', 72], ['C4H6O2', 28]], says: 'ethylene with 28 % vinyl acetate' },
  glass: { blend: [['SiO2', 73], ['Na2O', 14], ['CaO', 9], ['MgO', 4]], says: 'soda-lime glass' },
  fibreglass: { blend: [['SiO2', 54], ['Al2O3', 14], ['CaO', 22], ['B2O3', 8], ['MgO', 2]], says: 'E-glass' },
  fr4: { blend: [['fibreglass', 60], ['epoxy', 40]], says: 'glass cloth in epoxy' },
  bt: { blend: [['fibreglass', 55], ['epoxy', 45]], says: 'glass cloth in bismaleimide-triazine resin (as epoxy here; typical shares)' },
  cfrp: { blend: [['graphite', 60], ['epoxy', 40]], says: 'carbon fibre in epoxy' },
  'wood-veneer': { blend: [['paper', 50], ['C5H8O4', 25], ['C10H12O3', 25]], says: 'cellulose, hemicellulose and lignin' },
  'magnet-wire': { blend: [['copper', 98], ['polyimide', 2]], says: 'copper under a thin enamel' },
  'electrolyte-li': { blend: [['LiPF6', 12], ['C3H4O3', 44], ['C3H6O3', 44]], says: 'LiPF₆ in ethylene and dimethyl carbonate' },
  'electrolyte-al': { blend: [['C2H6O2', 80], ['H3BO3', 10], ['water', 10]], says: 'ethylene glycol and boric acid' },
  'solder-mask': { blend: [['epoxy', 80], ['quartz', 20]], says: 'epoxy with a silica filler' },
  grease: { blend: [['oil', 88], ['C18H35LiO2', 12]], says: 'mineral oil thickened with lithium stearate' },
  'al-laminate': { blend: [['al-foil', 40], ['nylon', 25], ['pp', 35]], says: 'nylon, aluminium foil and polypropylene' },
  'ruthenium-oxide': { formula: 'RuO2', says: 'ruthenium dioxide' }, 'silicone-alumina': { blend: [['silicone', 35], ['alumina', 65]], says: 'silicone filled with alumina, typical shares' }, 'fibre-gasket-sheet': { blend: [['fibreglass', 55], ['aramid', 15], ['nbr', 30]], says: 'glass and aramid fibre in nitrile, typical shares' }, 'cotton-fabric': { formula: 'C6H10O5', says: 'cellulose' }, aramid: { formula: 'C14H10N2O2', says: 'poly-paraphenylene terephthalamide' },
  'silver-paste': { blend: [['silver', 80], ['glass', 5], ['C10H18O', 15]], says: 'silver powder and glass frit in terpineol' },
  // the materials of the kinds of bought part (src/nexus/kinds)
  'stainless-316': { alloy: { Cr: 17, Ni: 12, Mo: 2.5, Mn: 1.5, Si: 0.5, C: 0.05, Fe: 'bal' }, grade: 'AISI 316, nominal' },
  'stainless-440c': { alloy: { Cr: 17, C: 1.1, Mo: 0.6, Mn: 0.8, Si: 0.8, Fe: 'bal' }, grade: 'AISI 440C, nominal' },
  'al-7075': { alloy: { Zn: 5.6, Mg: 2.5, Cu: 1.6, Cr: 0.23, Al: 'bal' }, grade: 'AA 7075, nominal' },
  'al-5052': { alloy: { Mg: 2.5, Cr: 0.25, Al: 'bal' }, grade: 'AA 5052, nominal' },
  'ti-6al4v': { alloy: { Al: 6, V: 4, Fe: 0.25, O: 0.2, Ti: 'bal' }, grade: 'Ti-6Al-4V (grade 5), nominal' },
  'cast-iron': { alloy: { C: 3.4, Si: 2.2, Mn: 0.6, Fe: 'bal' }, grade: 'grey iron, nominal' },
  zamak: { alloy: { Al: 4, Mg: 0.04, Zn: 'bal' }, grade: 'Zamak 3, nominal' },
  'steel-hss': { alloy: { W: 6.4, Mo: 5, Cr: 4.2, V: 1.9, C: 0.85, Fe: 'bal' }, grade: 'AISI M2 high-speed steel, nominal' },
  'tungsten-carbide': { blend: [['WC', 90], ['Co', 10]], says: 'tungsten carbide grains cemented with 10 % cobalt' },
  iron: { alloy: { Fe: 'bal' }, grade: 'commercially pure (type J +)' }, lead: { alloy: { Pb: 'bal' }, grade: 'commercially pure' }, lithium: { alloy: { Li: 'bal' }, grade: 'battery grade' },
  platinum: { alloy: { Pt: 'bal' }, grade: 'fine platinum' }, chromium: { alloy: { Cr: 'bal' }, grade: 'electroplated chromium' },
  'pt-rh6': { alloy: { Rh: 6, Pt: 'bal' }, grade: 'Pt-6 % Rh (type B −)' }, 'pt-rh10': { alloy: { Rh: 10, Pt: 'bal' }, grade: 'Pt-10 % Rh (type S +)' }, 'pt-rh13': { alloy: { Rh: 13, Pt: 'bal' }, grade: 'Pt-13 % Rh (type R +)' }, 'pt-rh30': { alloy: { Rh: 30, Pt: 'bal' }, grade: 'Pt-30 % Rh (type B +)' },
  constantan: { alloy: { Ni: 45, Cu: 'bal' }, grade: 'Cu-45 % Ni (types J, T and E −)' }, nicrosil: { alloy: { Cr: 14.2, Si: 1.4, Ni: 'bal' }, grade: 'Nicrosil (type N +)' }, nisil: { alloy: { Si: 4.4, Mg: 0.1, Ni: 'bal' }, grade: 'Nisil (type N −)' },
  'solder-snpb': { alloy: { Pb: 37, Sn: 'bal' }, grade: 'Sn63Pb37' }, 'solder-sn60': { alloy: { Pb: 40, Sn: 'bal' }, grade: 'Sn60Pb40' }, 'solder-sncu': { alloy: { Cu: 0.7, Sn: 'bal' }, grade: 'Sn99.3Cu0.7' },
  peek: { formula: 'C19H12O3', says: 'polyether ether ketone' }, si3n4: { formula: 'Si3N4' }, mno2: { formula: 'MnO2' }, pbo2: { formula: 'PbO2' }, ag2o: { formula: 'Ag2O' }, lani5: { formula: 'LaNi5', says: 'a hydrogen-storing alloy' },
  rosin: { formula: 'C20H30O2', says: 'abietic acid' }, 'organic-acid': { formula: 'C6H10O4', says: 'adipic acid, standing for a no-clean flux\'s weak organic acids' }, cyanoacrylate: { formula: 'C6H7NO2', says: 'ethyl cyanoacrylate' }, algainp: { formula: 'Al0.25Ga0.25In0.5P', says: 'aluminium gallium indium phosphide' }, 'yag-phosphor': { formula: 'Y2.94Ce0.06Al5O12', says: 'cerium-doped yttrium aluminium garnet' }, cds: { formula: 'CdS' },
  epdm: { blend: [['C2H4', 60], ['C3H6', 35], ['C9H12', 5]], says: 'ethylene, propylene and a little ENB diene, typical shares' },
  fkm: { blend: [['C2H2F2', 60], ['C3F6', 40]], says: 'vinylidene fluoride and hexafluoropropylene, typical shares' },
  asa: { blend: [['C3H3N', 30], ['C8H8', 50], ['C7H12O2', 20]], says: 'acrylonitrile, styrene and butyl acrylate, typical shares' },
  wood: { blend: [['paper', 45], ['C5H8O4', 25], ['C10H12O3', 30]], says: 'softwood: cellulose, hemicellulose and lignin' },
  bk7: { blend: [['SiO2', 70], ['B2O3', 10], ['Na2O', 8], ['K2O', 8], ['BaO', 4]], says: 'borosilicate crown glass (N-BK7 type), approximate' },
  'al-2024': { alloy: { Cu: 4.4, Mg: 1.5, Mn: 0.6, Al: 'bal' }, grade: 'AA 2024, nominal' },
  concrete: { blend: [['SiO2', 64], ['CaO', 15], ['Al2O3', 6], ['Fe2O3', 3], ['MgO', 2], ['H2O', 10]], says: 'cement, sand and gravel, as oxides, with the water bound in it; typical shares' },
  granite: { blend: [['SiO2', 72], ['Al2O3', 14], ['K2O', 4], ['Na2O', 3.5], ['CaO', 2], ['Fe2O3', 2.5], ['MgO', 1], ['H2O', 1]], says: 'quartz, feldspar and mica, as oxides; typical shares' },
  slate: { blend: [['SiO2', 60], ['Al2O3', 17], ['Fe2O3', 7], ['K2O', 4], ['MgO', 3], ['CaO', 2], ['Na2O', 2], ['H2O', 5]], says: 'metamorphosed shale, as oxides; typical shares' },
  marble: { formula: 'CaCO3', says: 'calcite' },
  brick: { blend: [['SiO2', 60], ['Al2O3', 25], ['Fe2O3', 7], ['CaO', 4], ['MgO', 2], ['K2O', 2]], says: 'fired clay, as oxides; typical shares' },
  'koh-electrolyte': { blend: [['KOH', 35], ['water', 65]], says: 'potassium hydroxide in water' },
  'acid-electrolyte': { blend: [['H2SO4', 37], ['water', 63]], says: 'sulfuric acid in water' },
  gypsum: { formula: 'CaSO6H4', says: 'calcium sulfate dihydrate, CaSO₄·2H₂O' }, argon: { formula: 'Ar' }, co2: { formula: 'CO2', says: 'carbon dioxide' },
  borosilicate: { blend: [['SiO2', 81], ['B2O3', 13], ['Na2O', 4], ['Al2O3', 2]], says: 'borosilicate 3.3 (ISO 3585)' }, rutile: { formula: 'TiO2', says: 'titanium dioxide' },
  ps: { formula: 'C8H8', says: 'polystyrene' }, zirconia: { formula: 'ZrO2', says: 'zirconium dioxide' }, 'zinc-oxide': { formula: 'ZnO', says: 'zinc oxide' }, pvb: { formula: 'C8H14O2', says: 'polyvinyl butyral' },
  portland: { blend: [['CaO', 64], ['SiO2', 21], ['Al2O3', 5], ['Fe2O3', 3], ['SO3', 3], ['MgO', 2], ['K2O', 1], ['Na2O', 1]], says: 'Portland cement, as oxides; typical shares' }, tungsten: { alloy: { W: 'bal' }, grade: 'pure tungsten (lamp and TIG wire)' },
  'al-4043': { alloy: { Si: 5.2, Al: 'bal' }, grade: 'AWS ER4043, nominal' }, 'al-5356': { alloy: { Mg: 5, Mn: 0.12, Cr: 0.12, Al: 'bal' }, grade: 'AWS ER5356, nominal' },
};
// the molecules of life (src/nexus/life/molecules.ts), each by its formula or blend
for (const mo of MOLECULES) { if (mo.id in MATERIALS) throw new Error(`molecule ${mo.id} is already a material`); MATERIALS[mo.id] = 'formula' in mo.spec ? { formula: mo.spec.formula, says: mo.name } : { blend: mo.spec.blend, says: mo.says }; }
const isMaterial = (x: string) => x in MATERIALS;
/** A material's own make-up, one level: [element symbol or material id, %]. */
export function makeup(id: string): [string, number][] {
  const s = MATERIALS[id]; if (!s) return [];
  if ('alloy' in s) { const named = Object.entries(s.alloy).filter(([, v]) => v !== 'bal') as [string, number][], sum = named.reduce((a, [, v]) => a + v, 0), bal = Object.entries(s.alloy).find(([, v]) => v === 'bal')?.[0]; return [...(bal ? [[bal, 100 - sum] as [string, number]] : []), ...named]; }
  if ('formula' in s) return Object.entries(formula(s.formula));
  const out = new Map<string, number>();
  for (const [what, pct] of s.blend) { if (isMaterial(what)) out.set(what, (out.get(what) ?? 0) + pct); else for (const [el, p] of Object.entries(formula(what))) out.set(el, (out.get(el) ?? 0) + (pct * p) / 100); }
  return [...out];
}
/** A material all the way down: its elements, by mass %. */
export function elementsOf(id: string, depth = 0): Record<string, number> {
  const out: Record<string, number> = {};
  if (depth > 8) return out;
  for (const [x, pct] of makeup(id)) { if (ELEMENTS[x]) out[x] = (out[x] ?? 0) + pct; else for (const [el, p] of Object.entries(elementsOf(x, depth + 1))) out[el] = (out[el] ?? 0) + (pct * p) / 100; }
  return out;
}
/** What a material's make-up is said to be (its grade, or what its formula or blend stands for). */
export function makeupSays(id: string): string { const s = MATERIALS[id]; if (!s) return ''; return 'grade' in s ? s.grade : 'formula' in s ? `${s.formula}${s.says ? `: ${s.says}` : ''}` : s.says; }
export const elementId = (sym: string) => `el-${sym.toLowerCase()}`;
