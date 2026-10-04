// Species: what matter is made of, counted by the identities a transformation conserves. A particle is counted by its
// charge, baryon number and lepton number; an atom by its protons, neutrons and electrons; a molecule by its atoms,
// with the bonds that hold them; a phase of a molecule by its standard enthalpy, entropy and heat capacity at
// 298.15 K and 1 bar. Nothing here is a property to be read off a name: these are the quantities from which the
// language derives what a matter does (src/nexus/compose.ts, src/nexus/phase.ts).

/** What a species counts of the identities. Particles count charge, baryon and lepton number; atoms and molecules count elements, and their nuclei are expanded by Z and A. */
export interface Species {
  name: string;
  /** Identities counted: an element's symbol, or 'charge', 'baryon', 'lepton'. */
  counts: Record<string, number>;
  /** Rest mass, kg. */
  mass?: number;
  phase?: 'solid' | 'liquid' | 'gas';
  /** Standard enthalpy of formation, J/mol, at 298.15 K and 1 bar. */
  H?: number;
  /** Standard molar entropy, J/(mol K), at 298.15 K and 1 bar. */
  S?: number;
  /** Molar heat capacity at constant pressure, J/(mol K), near 298.15 K. */
  cp?: number;
  /** The bonds that hold it, by kind, and how many. */
  bonds?: Record<string, number>;
  source: string;
}

export const PARTICLES: Species[] = [
  { name: 'electron', counts: { charge: -1, baryon: 0, lepton: 1 }, mass: 9.1093837015e-31, source: 'CODATA 2018' },
  { name: 'proton', counts: { charge: 1, baryon: 1, lepton: 0 }, mass: 1.67262192369e-27, source: 'CODATA 2018' },
  { name: 'neutron', counts: { charge: 0, baryon: 1, lepton: 0 }, mass: 1.67492749804e-27, source: 'CODATA 2018' },
  { name: 'positron', counts: { charge: 1, baryon: 0, lepton: -1 }, mass: 9.1093837015e-31, source: 'CODATA 2018: the electron\'s mass' },
  { name: 'neutrino', counts: { charge: 0, baryon: 0, lepton: 1 }, mass: 0, source: 'below 0.8 eV/c² (KATRIN, Nature Physics 18, 160, 2022): zero against the MeV of a decay' },
  { name: 'antineutrino', counts: { charge: 0, baryon: 0, lepton: -1 }, mass: 0, source: 'below 0.8 eV/c² (KATRIN, Nature Physics 18, 160, 2022): zero against the MeV of a decay' },
];

/** Elements by their nucleus: Z protons and A nucleons in the isotope counted, and the enthalpy of the free atom in the gas. */
export const ELEMENTS: Record<string, { Z: number; A: number; atomH?: number; source: string }> = {
  H: { Z: 1, A: 1, atomH: 217998, source: 'CODATA key values (1989): H(g) 217.998 kJ/mol' },
  C: { Z: 6, A: 12, atomH: 716680, source: 'CODATA key values: C(g) 716.68 kJ/mol' },
  N: { Z: 7, A: 14, atomH: 472680, source: 'CODATA key values: N(g) 472.68 kJ/mol' },
  O: { Z: 8, A: 16, atomH: 249180, source: 'CODATA key values: O(g) 249.18 kJ/mol' },
  Na: { Z: 11, A: 23, source: 'IUPAC' },
  Cl: { Z: 17, A: 35, source: 'IUPAC' },
  Au: { Z: 79, A: 197, source: 'IUPAC' },
  Pb: { Z: 82, A: 208, source: 'IUPAC: the most abundant isotope' },
};

/** Mean bond enthalpies, J/mol: averages over many molecules, so a molecule's own bonds differ from them. */
export const BONDS: Record<string, number> = {
  'H–H': 436e3, 'C–H': 413e3, 'C–C': 348e3, 'C=C': 614e3, 'C–O': 358e3, 'C=O': 799e3, 'C≡O': 1072e3, 'O–H': 463e3, 'O=O': 495e3, 'N–H': 391e3, 'N≡N': 941e3,
};
export const BONDS_SOURCE = 'mean bond enthalpies as tabulated in Brown, LeMay et al., Chemistry: The Central Science (averages, not any one molecule\'s)';

export const MOLECULES: Species[] = [
  { name: 'hydrogen', counts: { H: 2 }, phase: 'gas', H: 0, S: 130.68, cp: 28.84, bonds: { 'H–H': 1 }, source: 'CODATA key values' },
  { name: 'oxygen', counts: { O: 2 }, phase: 'gas', H: 0, S: 205.15, cp: 29.38, bonds: { 'O=O': 1 }, source: 'CODATA key values' },
  { name: 'nitrogen', counts: { N: 2 }, phase: 'gas', H: 0, S: 191.61, cp: 29.12, bonds: { 'N≡N': 1 }, source: 'CODATA key values' },
  { name: 'water', counts: { H: 2, O: 1 }, phase: 'gas', H: -241826, S: 188.835, cp: 33.58, bonds: { 'O–H': 2 }, source: 'CODATA key values: H₂O(g)' },
  { name: 'water', counts: { H: 2, O: 1 }, phase: 'liquid', H: -285830, S: 69.95, cp: 75.33, bonds: { 'O–H': 2 }, source: 'CODATA key values: H₂O(l)' },
  { name: 'carbon dioxide', counts: { C: 1, O: 2 }, phase: 'gas', H: -393510, S: 213.785, cp: 37.13, bonds: { 'C=O': 2 }, source: 'CODATA key values' },
  { name: 'carbon monoxide', counts: { C: 1, O: 1 }, phase: 'gas', H: -110530, S: 197.66, cp: 29.14, bonds: { 'C≡O': 1 }, source: 'CODATA key values' },
  { name: 'methane', counts: { C: 1, H: 4 }, phase: 'gas', H: -74870, S: 186.25, cp: 35.69, bonds: { 'C–H': 4 }, source: 'NIST Chemistry WebBook' },
  { name: 'ammonia', counts: { N: 1, H: 3 }, phase: 'gas', H: -45940, S: 192.77, cp: 35.06, bonds: { 'N–H': 3 }, source: 'NIST Chemistry WebBook' },
  { name: 'ethane', counts: { C: 2, H: 6 }, phase: 'gas', H: -84000, S: 229.2, cp: 52.49, bonds: { 'C–C': 1, 'C–H': 6 }, source: 'NIST Chemistry WebBook' },
  { name: 'ethylene', counts: { C: 2, H: 4 }, phase: 'gas', H: 52400, S: 219.3, cp: 42.9, bonds: { 'C=C': 1, 'C–H': 4 }, source: 'NIST Chemistry WebBook' },
  { name: 'methanol', counts: { C: 1, H: 4, O: 1 }, phase: 'gas', H: -201000, S: 239.9, cp: 44.1, bonds: { 'C–H': 3, 'C–O': 1, 'O–H': 1 }, source: 'NIST Chemistry WebBook' },
  { name: 'methanol', counts: { C: 1, H: 4, O: 1 }, phase: 'liquid', H: -239200, S: 126.8, cp: 81.1, bonds: { 'C–H': 3, 'C–O': 1, 'O–H': 1 }, source: 'NIST Chemistry WebBook; CRC Handbook' },
  { name: 'benzene', counts: { C: 6, H: 6 }, phase: 'gas', H: 82900, S: 269.2, cp: 82.4, bonds: { 'C=C': 3, 'C–C': 3, 'C–H': 6 }, source: 'NIST Chemistry WebBook: the bonds as one alternating (Kekulé) arrangement' },
  { name: 'benzene', counts: { C: 6, H: 6 }, phase: 'liquid', H: 49000, S: 173.4, cp: 136.0, bonds: { 'C=C': 3, 'C–C': 3, 'C–H': 6 }, source: 'NIST Chemistry WebBook' },
  { name: 'sodium chloride', counts: { Na: 1, Cl: 1 }, phase: 'solid', source: 'the formula unit of the crystal' },
  { name: 'sodium ion', counts: { Na: 1, charge: 1 }, source: 'the atom less one electron' },
  { name: 'chloride ion', counts: { Cl: 1, charge: -1 }, source: 'the atom with one more electron' },
  { name: 'lead', counts: { Pb: 1 }, phase: 'solid', source: 'the element' },
  { name: 'gold', counts: { Au: 1 }, phase: 'solid', source: 'the element' },
];

/** The measured normal boiling points the derivation is checked against: never an input to it. */
export const BOILING_AT_ONE_ATMOSPHERE: Record<string, { T: number; source: string }> = {
  water: { T: 373.124, source: 'ITS-90: 99.974 °C at 101.325 kPa' },
  benzene: { T: 353.2, source: 'NIST Chemistry WebBook: 353.2 K' },
  methanol: { T: 337.8, source: 'NIST Chemistry WebBook: 337.8 K' },
};

/** Water's saturation pressure, the checks for the vapour curve: IAPWS-95 tables. */
export const WATER_SATURATION: { T: number; p: number }[] = [
  { T: 298.15, p: 3169.9 }, { T: 323.15, p: 12352 }, { T: 343.15, p: 31201 }, { T: 393.15, p: 198670 },
];
