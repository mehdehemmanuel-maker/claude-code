// The physical constants, once (docs/REALITY.md, step 2): every module that needs one reads it from here, and the book
// makes its constant leaves (src/nexus/book/constants.ts) from these. The defining constants of the 2019 SI are exact;
// the rest are CODATA 2022 recommended values with their standard uncertainty. No imports: anything may read this.
//
// Sources: BIPM, The International System of Units (SI Brochure), 9th ed., 2019, Table 1 (the defining constants);
// Mohr, Newell, Taylor & Tiesinga, CODATA recommended values of the fundamental physical constants: 2022, Rev. Mod.
// Phys. 97, 025002 (2025), as NIST lists them (physics.nist.gov/cuu/Constants/Table/allascii.txt, read 2026-10-31);
// ISO 80000-3:2019 (standard acceleration of free fall). Moved from CODATA 2018 on 2026-10-31: mu0, eps0, Ry, me, mu.

export interface Constant {
  value: number;
  /** SI unit, as the units parser reads it. */
  unit: string;
  name: string;
  /** Exact by definition (the 2019 SI, or a conventional value fixed by a standard), or measured with an uncertainty. */
  exact: boolean;
  /** Standard uncertainty, in the unit. */
  uncertainty?: number;
  source: string;
}

const exact = (value: number, unit: string, name: string, source: string): Constant => ({ value, unit, name, exact: true, source });
const measured = (value: number, uncertainty: number, unit: string, name: string, source: string): Constant => ({ value, unit, name, exact: false, uncertainty, source });

/** The constants, by their usual symbol. */
export const CONSTANTS = {
  c: exact(299792458, 'm/s', 'speed of light in vacuum', 'SI (2019): exact by definition'),
  h: exact(6.62607015e-34, 'J s', 'Planck constant', 'SI (2019): exact by definition'),
  e: exact(1.602176634e-19, 'C', 'elementary charge', 'SI (2019): exact by definition'),
  kB: exact(1.380649e-23, 'J/K', 'Boltzmann constant', 'SI (2019): exact by definition'),
  NA: exact(6.02214076e23, 'mol^-1', 'Avogadro constant', 'SI (2019): exact by definition'),
  R: exact(8.314462618, 'J/mol K', 'molar gas constant', 'SI (2019): k_B N_A, exact (8.314462618…)'),
  F: exact(96485.33212, 'C/mol', 'Faraday constant', 'SI (2019): e N_A, exact (96485.33212…)'),
  sigmaSB: exact(5.670374419e-8, 'W/m^2 K^4', 'Stefan–Boltzmann constant', 'CODATA 2022: 2π⁵k_B⁴/(15h³c²), exact from exact constants (5.670374419…)'),
  g: exact(9.80665, 'm/s^2', 'standard acceleration of free fall', 'ISO 80000-3: a defined conventional value'),
  G: measured(6.6743e-11, 1.5e-15, 'm^3/kg s^2', 'Newtonian constant of gravitation', 'CODATA 2022: 6.67430(15)e-11 (unchanged from 2018)'),
  mu0: measured(1.25663706127e-6, 2.0e-16, 'N/A^2', 'vacuum magnetic permeability', 'CODATA 2022: 1.25663706127(20)e-6'),
  eps0: measured(8.8541878188e-12, 1.4e-21, 'F/m', 'vacuum electric permittivity', 'CODATA 2022: 8.8541878188(14)e-12'),
  b: exact(2.897771955e-3, 'm K', 'Wien wavelength displacement law constant', 'CODATA 2022: hc/(4.965114231… k_B), exact from exact constants (2.897771955…e-3)'),
  Ry: measured(13.60569312299, 1.5e-11, 'eV', 'Rydberg energy (R∞ h c)', 'CODATA 2022: 13.605693122990(15) eV'),
  me: measured(9.1093837139e-31, 2.8e-40, 'kg', 'electron mass', 'CODATA 2022: 9.1093837139(28)e-31'),
  mu: measured(1.66053906892e-27, 5.2e-37, 'kg', 'atomic mass constant', 'CODATA 2022: 1.66053906892(52)e-27'),
} as const satisfies Record<string, Constant>;

/** Standard gravity, m/s²: read so often that it has its own name. */
export const STANDARD_GRAVITY = CONSTANTS.g.value;
/** Stefan–Boltzmann constant, W/(m² K⁴). */
export const SIGMA_SB = CONSTANTS.sigmaSB.value;
/** Faraday constant, C/mol. */
export const FARADAY = CONSTANTS.F.value;
/** Where the three names above come from, and their claim status: each is its constant's own (spec 10, T3). */
export const ALIAS_SOURCES: Record<string, string> = { STANDARD_GRAVITY: CONSTANTS.g.source, SIGMA_SB: CONSTANTS.sigmaSB.source, FARADAY: CONSTANTS.F.source };
export const ALIAS_STATUS: Record<string, string> = { STANDARD_GRAVITY: CONSTANTS.g.exact ? 'exact' : 'measured', SIGMA_SB: CONSTANTS.sigmaSB.exact ? 'exact' : 'measured', FARADAY: CONSTANTS.F.exact ? 'exact' : 'measured' };
