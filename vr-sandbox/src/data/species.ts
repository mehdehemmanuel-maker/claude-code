// Species: what matter is made of, counted by the identities a transformation conserves. A particle is counted by its
// charge, baryon number and lepton number; an atom by its protons, neutrons and electrons; a molecule by its atoms,
// with the bonds that hold them; a phase of a molecule by its standard enthalpy, entropy and heat capacity at
// 298.15 K and 1 bar. Nothing here is a property to be read off a name: these are the quantities from which the
// language derives what a matter does (src/nexus/substrate/compose.ts, src/nexus/substrate/phase.ts).

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

/**
 * Crystals of the elements: the lattice they take, its constant at room temperature, the energy that binds an atom in
 * it (the cohesive energy, against the free atom), and the measured density and bulk modulus the derivation is
 * checked against, never fed. Kittel, Introduction to Solid State Physics, 8th ed., tables 1.4, 3.1 and 3.3 (the lattice
 * constants at room temperature, except lithium's at 78 K and sodium's and potassium's at 5 K); densities
 * from the CRC Handbook; atomic masses from IUPAC. The conduction electrons per atom are Kittel's table 6.1, which does
 * not list nickel or tungsten.
 */
export interface Crystal { element: string; lattice: 'fcc' | 'bcc'; a: number; /** the temperature the lattice constant was measured at, K */ at: number; cohesive: number; mass: number; valence: string; /** the electrons each atom gives to the crystal's conduction, where the free-electron table states it (Kittel, table 6.1) */ free?: number; measured: { density: number; bulk: number } }
const eV = 1.602176634e-19, u = 1.66053906660e-27;
export const CRYSTALS: Crystal[] = [
  { element: 'Li', lattice: 'bcc', a: 3.49e-10, at: 78, cohesive: 1.63 * eV, mass: 6.94 * u, valence: 'one s electron', free: 1, measured: { density: 534, bulk: 0.116e11 } },
  { element: 'Na', lattice: 'bcc', a: 4.23e-10, at: 5, cohesive: 1.113 * eV, mass: 22.990 * u, valence: 'one s electron', free: 1, measured: { density: 968, bulk: 0.068e11 } },
  { element: 'K', lattice: 'bcc', a: 5.23e-10, at: 5, cohesive: 0.934 * eV, mass: 39.098 * u, valence: 'one s electron', free: 1, measured: { density: 862, bulk: 0.032e11 } },
  { element: 'Al', lattice: 'fcc', a: 4.05e-10, at: 298, cohesive: 3.39 * eV, mass: 26.982 * u, valence: 's and p electrons', free: 3, measured: { density: 2699, bulk: 0.722e11 } },
  { element: 'Fe', lattice: 'bcc', a: 2.87e-10, at: 298, cohesive: 4.28 * eV, mass: 55.845 * u, valence: 'd electrons', free: 2, measured: { density: 7874, bulk: 1.683e11 } },
  { element: 'Ni', lattice: 'fcc', a: 3.52e-10, at: 298, cohesive: 4.44 * eV, mass: 58.693 * u, valence: 'd electrons', measured: { density: 8908, bulk: 1.86e11 } },
  { element: 'Cu', lattice: 'fcc', a: 3.61e-10, at: 298, cohesive: 3.49 * eV, mass: 63.546 * u, valence: 'd electrons', free: 1, measured: { density: 8960, bulk: 1.37e11 } },
  { element: 'Ag', lattice: 'fcc', a: 4.09e-10, at: 298, cohesive: 2.95 * eV, mass: 107.87 * u, valence: 'd electrons', free: 1, measured: { density: 10490, bulk: 1.007e11 } },
  { element: 'W', lattice: 'bcc', a: 3.16e-10, at: 298, cohesive: 8.90 * eV, mass: 183.84 * u, valence: 'd electrons', measured: { density: 19250, bulk: 3.232e11 } },
  { element: 'Au', lattice: 'fcc', a: 4.08e-10, at: 298, cohesive: 3.81 * eV, mass: 196.97 * u, valence: 'd electrons', free: 1, measured: { density: 19300, bulk: 1.732e11 } },
  { element: 'Pb', lattice: 'fcc', a: 4.95e-10, at: 298, cohesive: 2.03 * eV, mass: 207.2 * u, valence: 's and p electrons over filled d shells', free: 4, measured: { density: 11340, bulk: 0.430e11 } },
];

/** Liquid water's viscosity and density over temperature, the checks for a barrier: CRC Handbook of Chemistry and Physics. */
export const WATER_VISCOSITY: { T: number; eta: number; rho: number }[] = [
  { T: 273.15, eta: 1.792e-3, rho: 999.84 }, { T: 283.15, eta: 1.3059e-3, rho: 999.70 }, { T: 293.15, eta: 1.0016e-3, rho: 998.21 },
  { T: 298.15, eta: 0.8900e-3, rho: 997.05 }, { T: 303.15, eta: 0.7972e-3, rho: 995.65 }, { T: 313.15, eta: 0.6527e-3, rho: 992.22 },
  { T: 323.15, eta: 0.5465e-3, rho: 988.03 }, { T: 333.15, eta: 0.4660e-3, rho: 983.20 }, { T: 343.15, eta: 0.4035e-3, rho: 977.76 },
  { T: 353.15, eta: 0.3540e-3, rho: 971.79 }, { T: 363.15, eta: 0.3142e-3, rho: 965.31 }, { T: 373.15, eta: 0.2816e-3, rho: 958.35 },
];
/** Water's molar mass, kg/mol (IUPAC), and its dielectric (Debye) relaxation time at 25 °C: Kaatze, J. Chem. Eng. Data 34, 371 (1989). */
export const WATER_MOLAR_MASS = 0.018015;
export const WATER_DEBYE_TIME = 8.27e-12;

/**
 * The kept crystals' melting points at one atmosphere, K: CRC Handbook of Chemistry and Physics (97th ed.), section 4.
 * They are the evidence a melting rule is abduced from and checked against, one left out at a time.
 */
export const MELTING: Record<string, number> = {
  Li: 453.65, Na: 370.944, K: 336.53, Al: 933.473, Fe: 1811, Ni: 1728, Cu: 1357.77, Ag: 1234.93, W: 3695, Au: 1337.33, Pb: 600.61,
};
